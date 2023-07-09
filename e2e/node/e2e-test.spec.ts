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

import {
  jest,
  it,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  expect,
} from "@jest/globals";
import { custom } from "openid-client";
import {
  getBrowserTestingEnvironment,
  getNodeTestingEnvironment,
  getPodRoot,
} from "@inrupt/internal-test-env";
import { CognitoPage, OpenIdPage } from "@inrupt/internal-playwright-helpers";
import type { Request } from "@playwright/test";
import { firefox } from "@playwright/test";
// Here we want to test how the local code behaves, not the already published one.
// eslint-disable-next-line import/no-relative-packages
import type { ILogoutOptions } from "core";
import { Session, EVENTS } from "@inrupt/solid-client-authn-node/src/index";
import type { ISeedPodResponse } from "../browser/test/fixtures";
import { seedPod, tearDownPod } from "../browser/test/fixtures";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const ENV = getNodeTestingEnvironment();
const BROWSER_ENV = getBrowserTestingEnvironment();
const { owner } = ENV.clientCredentials;
const CSS = owner.type === "CSS Client Credentials";

function getCredentials() {
  if (CSS) {
    throw new Error(
      "CSS Does not support client credentials - these tests are not supported"
    );
  }

  return {
    clientId: owner.id,
    clientSecret: owner.secret,
    oidcIssuer: ENV.idp,
  };
}

describe("handleIncomingRedirect", () => {
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

  it("Should reject trying to perform RP initiated logout after login", async () => {
    const session = new Session();

    const logoutParams: ILogoutOptions = {
      logoutType: "idp",
    };

    // FIXME Check the error message
    await expect(session.login(logoutParams)).rejects.toThrow();
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
          redirectUrl: "http://localhost:3001/",
          async handleRedirect(url) {
            await page.goto(url);
            const cognitoPage = new CognitoPage(page);
            await cognitoPage.login(
              BROWSER_ENV.clientCredentials.owner.login,
              BROWSER_ENV.clientCredentials.owner.password
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
          if (pg.url().startsWith("http://localhost:3001/")) {
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
          if (pg.url().startsWith("http://localhost:3001/postLogoutUrl")) {
            page.off("request", requestListener2);
            await browser.close();
            resolveFunc(responseUrl);
          }
        };
        page.on("request", requestListener2);
        try {
          await page.goto(url);
        } catch (e) {
          // Suppress this goto error; it occurs because we redirect to http://localhost:3001/postLogoutUrl
          // which is not served
        }
      },
      postLogoutUrl: "http://localhost:3001/postLogoutUrl",
    };

    await session.logout(logoutParams);

    const res2 = await session.fetch(clientResourceUrl);
    expect(res2.status).toBe(401);

    // This ensures that the browser redirects to http://localhost:3001/postLogoutUrl
    await expect(finalRedirectUrl).resolves.toBe(
      "http://localhost:3001/postLogoutUrl"
    );

    await expect(session.login(logoutParams)).rejects.toThrow();

    // Testing to make sure RP Initiated Logout occurred with an id_token_hint
    expect(
      rpLogoutUrl &&
        new URL(rpLogoutUrl).searchParams.get("id_token_hint")?.length
    ).toBeGreaterThan(1);
    await session.logout();
  }, 120_000);
});

(CSS ? describe.skip : describe)(
  `End-to-end authentication tests for environment [${ENV.environment}}]`,
  () => {
    const authenticatedSession = new Session();

    // Log back in on session expiration
    authenticatedSession.events.on("sessionExpired", () =>
      authenticatedSession.login(getCredentials())
    );
    beforeAll(() => authenticatedSession.login(getCredentials()));

    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    afterAll(() => authenticatedSession.logout());

    describe("Authenticated fetch", () => {
      it("properly sets up session information", async () => {
        expect(authenticatedSession.info.isLoggedIn).toBe(true);
        expect(authenticatedSession.info.sessionId).toBeDefined();
        expect(authenticatedSession.info.webId).toBeDefined();
        expect(authenticatedSession.info.expirationDate).toBeGreaterThan(
          Date.now()
        );
      });

      it("can fetch a public resource when logged in", async () => {
        // FIXME: the WebID isn't necessarily a Solid resource.
        const publicResourceUrl = authenticatedSession.info.webId as string;
        const response = await authenticatedSession.fetch(publicResourceUrl, {
          headers: {
            Accept: "text/turtle",
          },
        });
        expect(response.status).toBe(200);
        await expect(response.text()).resolves.toContain(
          authenticatedSession.info.webId
        );
      });

      it("can fetch a private resource when logged in", async () => {
        // The following line doesn't compile because of the recursive dependency
        // between the current package, the shared environment setup, and the
        // published version of the current package.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const privateResourceUrl = await getPodRoot(authenticatedSession);
        const response = await authenticatedSession.fetch(privateResourceUrl, {
          headers: {
            Accept: "text/turtle",
          },
        });
        expect(response.status).toBe(200);
        // The root should contain at least one child
        await expect(response.text()).resolves.toContain("contains");
      });

      it("can fetch a private resource when logged in after the same fetch failed", async () => {
        const unauthSession = new Session();
        // The following line doesn't compile because of the recursive dependency
        // between the current package, the shared environment setup, and the
        // published version of the current package.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const privateResourceUrl = await getPodRoot(authenticatedSession);
        let response = await unauthSession.fetch(privateResourceUrl);
        expect(response.status).toBe(401);

        await unauthSession.login(getCredentials());

        response = await unauthSession.fetch(privateResourceUrl);
        expect(response.status).toBe(200);

        await unauthSession.logout();
      });
    });

    describe("Unauthenticated fetch", () => {
      it("can fetch a public resource when not logged in", async () => {
        // FIXME: This is only required to get a WebID. Once test setup is automated,
        // this should be deleted.
        const publicResourceUrl = authenticatedSession.info.webId as string;

        const unauthenticatedSession = new Session();
        const response = await unauthenticatedSession.fetch(publicResourceUrl, {
          headers: {
            Accept: "text/turtle",
          },
        });
        expect(response.status).toBe(200);
        await expect(response.text()).resolves.toContain(
          authenticatedSession.info.webId
        );
      });

      it("cannot fetch a private resource when not logged in", async () => {
        const unauthenticatedSession = new Session();
        // The following line doesn't compile because of the recursive dependency
        // between the current package, the shared environment setup, and the
        // published version of the current package.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const privateResourceUrl = await getPodRoot(authenticatedSession);
        const response = await unauthenticatedSession.fetch(privateResourceUrl);
        expect(response.status).toBe(401);
      });
    });

    describe("Post-logout fetch", () => {
      beforeAll(async () => authenticatedSession.logout());

      it("can fetch a public resource after logging out", async () => {
        // FIXME: the WebID isn't necessarily a Solid resource.
        const publicResourceUrl = authenticatedSession.info.webId as string;
        const response = await authenticatedSession.fetch(publicResourceUrl, {
          headers: {
            Accept: "text/turtle",
          },
        });
        expect(response.status).toBe(200);
        await expect(response.text()).resolves.toContain(
          authenticatedSession.info.webId
        );
      });

      it("cannot fetch a private resource after logging out", async () => {
        // The following line doesn't compile because of the recursive dependency
        // between the current package, the shared environment setup, and the
        // published version of the current package.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const privateResourceUrl = await getPodRoot(authenticatedSession);
        const response = await authenticatedSession.fetch(privateResourceUrl);
        expect(response.status).toBe(401);
      });
    });
  }
);

describe("Session events", () => {
  // These tests will check for session expiration, so they'll need a longer timeout.
  jest.setTimeout(15 * 60 * 1000);

  let session: Session;
  let loginFunc: () => void;
  let logoutFunc: () => void;
  let expiredFunc: () => void;

  beforeEach(async () => {
    session = new Session();
    loginFunc = jest.fn();
    logoutFunc = jest.fn();
    expiredFunc = jest.fn();
    session.events.on(EVENTS.LOGIN, loginFunc);
    session.events.on(EVENTS.LOGOUT, logoutFunc);
    session.events.on(EVENTS.SESSION_EXPIRED, expiredFunc);

    await session.login(getCredentials());
  });

  it("sends an event on successful login and logout", async () => {
    expect(session.info.isLoggedIn).toBe(true);
    await session.logout();

    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(1);
    expect(expiredFunc).toHaveBeenCalledTimes(0);
  });

  it("sends an event on session expiration", async () => {
    if (typeof session.info.expirationDate !== "number") {
      throw new Error("Cannot determine session expiration date");
    }
    const expiresIn = session.info.expirationDate - Date.now();
    await new Promise((resolve) => {
      setTimeout(resolve, expiresIn);
    });

    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(0);
    expect(expiredFunc).toHaveBeenCalledTimes(1);
    await session.logout();
    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(1);
    expect(expiredFunc).toHaveBeenCalledTimes(1);
  });
});
