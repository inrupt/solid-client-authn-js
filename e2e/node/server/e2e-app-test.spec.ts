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
import { custom } from "openid-client";
import type { Server } from "http";
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

async function performTest(seedInfo: ISeedPodResponse) {
  const browser = await firefox.launch();
  const page = await browser.newPage();
  const url = new URL(
    `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/login`,
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

  // Fetching a protected resource once logged in
  const resourceUrl = new URL(
    `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/fetch`,
  );
  resourceUrl.searchParams.append("resource", seedInfo.clientResourceUrl);
  await page.goto(resourceUrl.toString());
  await expect(page.content()).resolves.toBe(
    `<html><head></head><body>${seedInfo.clientResourceContent}</body></html>`,
  );

  // Performing idp logout and being redirected to the postLogoutUrl after doing so
  await page.goto(
    `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/idplogout`,
  );
  await page.waitForURL(
    `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`,
  );
  await expect(page.content()).resolves.toBe(
    `<html><head></head><body>successfully at post logout</body></html>`,
  );

  // Should not be able to retrieve the protected resource after logout
  await page.goto(resourceUrl.toString());
  await expect(page.content()).resolves.toMatch("Unauthorized");

  // Testing what happens if we try to log back in again after logging out
  await page.goto(url.toString());

  // It should go back to the cognito page when we try to log back in
  // rather than skipping straight to the consent page
  await page.waitForURL((navigationUrl) => {
    const u1 = new URL(navigationUrl);
    u1.searchParams.delete("state");

    const u2 = new URL(cognitoPageUrl);
    u2.searchParams.delete("state");

    return u1.toString() === u2.toString();
  });

  await browser.close();
}

describe("Testing against express app with default session", () => {
  let app: Server;
  let seedInfo: ISeedPodResponse;

  beforeEach(async () => {
    seedInfo = await seedPod(ENV);
    await new Promise<void>((res) => {
      app = createApp({}, res);
    });
  }, 30_000);

  afterEach(async () => {
    await tearDownPod(seedInfo);
    await new Promise<void>((res) => {
      app.close(() => res());
    });
  }, 30_000);

  it("Should be able to properly login and out with idp logout", async () => {
    await performTest(seedInfo);
  }, 120_000);
});

describe("Testing against express app with session keep alive off", () => {
  let app: Server;
  let seedInfo: ISeedPodResponse;

  beforeEach(async () => {
    seedInfo = await seedPod(ENV);
    await new Promise<void>((res) => {
      app = createApp(res, { keepAlive: false });
    });
  }, 30_000);

  afterEach(async () => {
    await tearDownPod(seedInfo);
    await new Promise<void>((res) => {
      app.close(() => res());
    });
  }, 30_000);

  it("Should be able to properly login and out with idp logout", async () => {
    await performTest(seedInfo);
  }, 120_000);
});
