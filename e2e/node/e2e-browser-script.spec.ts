//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import { CognitoPage, OpenIdPage } from "@inrupt/internal-playwright-helpers";
import {
  getBrowserTestingEnvironment,
  getNodeTestingEnvironment,
} from "@inrupt/internal-test-env";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { Request } from "@playwright/test";
import { firefox } from "@playwright/test";
import type { ILogoutOptions } from "core";
import { custom } from "openid-client";
// Here we want to test how the local code behaves, not the already published one.
// eslint-disable-next-line import/no-relative-packages
import { Session } from "../../packages/node/src/index";
import type { ISeedPodResponse } from "../browser/solid-client-authn-browser/test/fixtures";
import {
  seedPod,
  tearDownPod,
} from "../browser/solid-client-authn-browser/test/fixtures";
import { CLIENT_AUTHN_TEST_PORT } from "../../playwright.client-authn.config";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const ENV = getNodeTestingEnvironment();
const BROWSER_ENV = getBrowserTestingEnvironment();

describe("RP initiated login/out using playwright", () => {
  let seedInfo: ISeedPodResponse;
  let clientId: string;
  let clientResourceUrl: string;

  beforeAll(async () => {
    seedInfo = await seedPod(ENV);
    clientId = seedInfo.clientId;
    clientResourceUrl = seedInfo.clientResourceUrl;
  }, 30_000);

  afterAll(async () => {
    await tearDownPod(seedInfo);
  }, 30_000);

  it("Should reject trying to perform RP initiated logout before login", async () => {
    const session = new Session();

    const logoutParams: ILogoutOptions = {
      logoutType: "idp",
    };

    await expect(session.logout(logoutParams)).rejects.toThrow(
      "Cannot perform IDP logout. Did you log in using the OIDC authentication flow?",
    );
  });

  it("Should be able to login and out using oidc", async () => {
    const session = new Session();

    let rpLogoutUrl: string | undefined;
    const redirectUrl = await new Promise<string>((res) => {
      (async () => {
        const browser = await firefox.launch();
        const page = await browser.newPage();
        await session.login({
          oidcIssuer: ENV.idp,
          redirectUrl: `http://localhost:${CLIENT_AUTHN_TEST_PORT}/`,
          async handleRedirect(url) {
            await page.goto(url);
            const cognitoPage = new CognitoPage(page);
            await cognitoPage.login(
              BROWSER_ENV.clientCredentials.owner.login,
              BROWSER_ENV.clientCredentials.owner.password,
            );
            const openidPage = new OpenIdPage(page);
            try {
              await openidPage.allow();
            } catch (e) {
              // Ignore allow error for now
            }
          },
          clientId,
        });

        const requestListener = async (pg: Request) => {
          if (
            pg.url().startsWith(`http://localhost:${CLIENT_AUTHN_TEST_PORT}/`)
          ) {
            page.off("request", requestListener);
            await browser.close();
            res(pg.url());
          }
        };

        page.on("request", requestListener);
      })().catch(console.error);
    });
    await session.handleIncomingRedirect(redirectUrl);
    const res = await session.fetch(clientResourceUrl);
    expect(res.status).toBe(200);
    let resolveFunc: (str: string) => void;
    const finalRedirectUrl = new Promise<string>((resolve) => {
      resolveFunc = resolve;
    });

    const logoutParams: ILogoutOptions = {
      logoutType: "idp",
      async handleRedirect(url) {
        rpLogoutUrl = url;
        const browser = await firefox.launch();
        const page = await browser.newPage();

        const requestListener2 = async (pg: Request) => {
          const responseUrl = pg.url();
          if (
            pg
              .url()
              .startsWith(
                `http://localhost:${CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`,
              )
          ) {
            page.off("request", requestListener2);
            await browser.close();
            resolveFunc(responseUrl);
          }
        };
        page.on("request", requestListener2);
        try {
          await page.goto(url);
        } catch (e) {
          // Suppress this goto error; it occurs because we redirect to http://localhost:3002/postLogoutUrl
          // which is not served
        }
      },
      postLogoutUrl: `http://localhost:${CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`,
    };
    await session.logout(logoutParams);
    const res2 = await session.fetch(clientResourceUrl);
    expect(res2.status).toBe(401);
    // This ensures that the browser redirects to http://localhost:3002/postLogoutUrl
    await expect(finalRedirectUrl).resolves.toBe(
      "http://localhost:3002/postLogoutUrl",
    );
    // Should error when trying to logout again with idp logout
    await expect(session.logout(logoutParams)).rejects.toThrow(
      "Cannot perform IDP logout. Did you log in using the OIDC authentication flow?",
    );
    // Testing to make sure RP Initiated Logout occurred with an id_token_hint
    expect(
      rpLogoutUrl &&
        new URL(rpLogoutUrl).searchParams.get("id_token_hint")?.length,
    ).toBeGreaterThan(1);
    await session.logout();
  }, 120_000);
});
