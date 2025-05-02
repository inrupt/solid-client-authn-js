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
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { firefox } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { custom } from "openid-client";
import type { Server } from "http";
import type { SessionTokenSet } from "node";
import {
  type ISeedPodResponse,
  seedPod,
  tearDownPod,
} from "../../browser/solid-client-authn-browser/test/fixtures";
import { createApp } from "./express";
// Extensions are required for JSON-LD imports.
// eslint-disable-next-line import/extensions
import CONSTANTS from "../../../playwright.client-authn.constants.json";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const ENV = getNodeTestingEnvironment();
const BROWSER_ENV = getBrowserTestingEnvironment();

type LoginFixture = {
  browser: Browser;
  page: Page;
  loginUrl: string;
  cognitoPageUrl: string;
};

/**
 * Helper function to log in a user and return the browser, page, and login URLs
 */
async function loginUser(
  seedInfo: ISeedPodResponse,
  legacyMode: boolean,
): Promise<LoginFixture> {
  const browser = await firefox.launch();
  const page = await browser.newPage();
  const url = new URL(
    `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/${legacyMode ? "legacy/" : ""}login`,
  );
  url.searchParams.append("oidcIssuer", ENV.idp);
  url.searchParams.append("clientId", seedInfo.clientId);

  await page.goto(url.toString());

  // Wait for navigation outside the localhost session
  await page.waitForURL(/^https/);
  const cognitoPageUrl = page.url();

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

  await page.waitForURL(
    `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/`,
  );

  return { browser, page, loginUrl: url.toString(), cognitoPageUrl };
}

// Testing the OIDC Authorization Code flow in an express-based web application.
// The tests are configured to run with options for legacy/token mode and keepAlive.
const SHORT_TIMEOUT = 30_000;

describe.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])(
  "Testing against express app with legacyMode %s and keepAlive %s",
  (legacyMode, keepAlive) => {
    let app: Server;
    let seedInfo: ISeedPodResponse;
    let testFixture: LoginFixture;

    beforeEach(async () => {
      // Enable refresh in clientId document
      seedInfo = await seedPod(ENV, true);
      await new Promise<void>((res) => {
        app = createApp(res, { keepAlive });
      });
      testFixture = await loginUser(seedInfo, legacyMode);
    }, SHORT_TIMEOUT);

    afterEach(async () => {
      await tearDownPod(seedInfo);
      await new Promise<void>((res) => {
        app.close(() => res());
      });
    }, SHORT_TIMEOUT);

    it("should be able to log in and perform an authenticated fetch", async () => {
      const { page, browser } = testFixture;
      try {
        // Fetching a protected resource once logged in
        const resourceUrl = new URL(
          `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/${legacyMode ? "legacy/" : "tokens/"}fetch`,
        );
        resourceUrl.searchParams.append("resource", seedInfo.clientResourceUrl);
        await page.goto(resourceUrl.toString());
        await expect(page.content()).resolves.toBe(
          `<html><head></head><body>${seedInfo.clientResourceContent}</body></html>`,
        );
      } finally {
        await browser.close();
      }
    }, 120_000);

    it("should be able to perform RP-initiated logout", async () => {
      const { page, browser, loginUrl, cognitoPageUrl } = testFixture;
      try {
        // Performing idp logout and being redirected to the postLogoutUrl after doing so
        await testFixture.page.goto(
          `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/${legacyMode ? "legacy/" : "tokens/"}logout`,
        );
        await page.waitForURL(
          `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`,
        );
        await expect(page.content()).resolves.toBe(
          `<html><head></head><body>successfully at post logout</body></html>`,
        );

        // Should not be able to retrieve the protected resource after logout
        // Fetching a protected resource once logged in
        const resourceUrl = new URL(
          `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/${legacyMode ? "legacy/" : "tokens/"}fetch`,
        );
        resourceUrl.searchParams.append("resource", seedInfo.clientResourceUrl);
        await page.goto(resourceUrl.toString());
        await expect(page.content()).resolves.toMatch("Unauthorized");

        // Testing what happens if we try to log back in again after logging out
        await page.goto(loginUrl);

        // It should go back to the cognito page when we try to log back in
        // rather than skipping straight to the consent page
        await page.waitForURL((navigationUrl) => {
          const u1 = new URL(navigationUrl);
          u1.searchParams.delete("state");

          const u2 = new URL(cognitoPageUrl);
          u2.searchParams.delete("state");

          return u1.toString() === u2.toString();
        });
      } finally {
        await browser.close();
      }
    }, 120_000);
  },
);

// Add a specific test for the token management functionality with only keepAlive being toggled
describe.each([[true], [false]])(
  "Testing token management with keepAlive %s",
  (keepAlive) => {
    let app: Server;
    let seedInfo: ISeedPodResponse;
    let testFixture: LoginFixture;

    beforeEach(async () => {
      // Enable refresh in clientId document
      seedInfo = await seedPod(ENV, true);
      await new Promise<void>((res) => {
        app = createApp(res, { keepAlive });
      });
      testFixture = await loginUser(seedInfo, false);
    }, SHORT_TIMEOUT);

    afterEach(async () => {
      await tearDownPod(seedInfo);
      await new Promise<void>((res) => {
        app.close(() => res());
      });
    }, SHORT_TIMEOUT);

    it("Should be able to manage the tokens explicitly", async () => {
      const { page, browser } = testFixture;
      try {
        // Fetching the token set returned after login
        const tokensUrl = new URL(
          `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/tokens`,
        );

        // Use page.evaluate to fetch JSON response
        await page.goto(tokensUrl.toString());
        const tokenSet: SessionTokenSet = await page.evaluate(() => {
          try {
            return JSON.parse(document.body.textContent || "{}");
          } catch (e) {
            return null;
          }
        });

        expect(tokenSet).toBeDefined();
        expect(tokenSet.accessToken).toBeDefined();
        expect(tokenSet.idToken).toBeDefined();
        expect(tokenSet.expiresAt).toBeDefined();
        expect(tokenSet.dpopKey).toBeDefined();
        expect(tokenSet.webId).toBeDefined();
      } finally {
        await browser.close();
      }
    }, 120_000);
  },
);
