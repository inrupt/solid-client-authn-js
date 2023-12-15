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

import { TESTID_SELECTORS } from "@inrupt/internal-playwright-testids";
import { v4 } from "uuid";
import { getBrowserTestingEnvironment } from "@inrupt/internal-test-env";
import { test, expect } from "./fixtures";
// Extensions are required for JSON imports.
// eslint-disable-next-line import/extensions
import CONSTANTS from "../../../../playwright.client-authn.constants.json";

const env = getBrowserTestingEnvironment();

// TODO: Redirected resource tests? I'm not sure what those actually show

test.describe("Not Logged In", () => {
  // Skipping this for now, as it is currently failing. Will investigate separately.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip("Public resource in my Pod", async ({ testContainer, app }) => {
    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.publicResource);

    expect(response).toBe(testContainer.publicFileText);
  });

  test("Private resource in my Pod", async ({ testContainer, app }) => {
    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.privateResource);

    expect(response).toContain("401");
    expect(response).toContain("Unauthorized");
  });

  // FIXME: This doesn't actually currently work as we don't know if the file exists or not as we get a 401:
  test.fixme(
    "Non-existent resource in my Pod",
    async ({ testContainer, app }) => {
      expect(await app.getFetchResponse()).toBe("not fetched");

      const response = await app.fetchResource(
        testContainer.nonExistentResource,
      );

      expect(response).toContain("Can't find file requested");
    },
  );
});

test.describe("Logged In", () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login({ allow: true });
  });

  test("The session information are set appropriately", async ({
    app,
    page,
  }) => {
    expect(await app.isLoginSignalReceived()).toBe(true);
    expect(await app.getExpirationDate()).toBeGreaterThan(Date.now());
    await page.click(TESTID_SELECTORS.LOGOUT_BUTTON);
    expect(await app.isLogoutSignalReceived()).toBe(true);
  });

  test("Public resource in my Pod", async ({ app, testContainer }) => {
    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.publicResource);

    expect(response).toBe(testContainer.publicFileText);
  });

  test("Private resource in my Pod", async ({ app, testContainer }) => {
    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.privateResource);

    expect(response).toBe(testContainer.privateFileText);
  });

  test("Private resource in my Pod, after refresh (using auto-login)", async ({
    app,
    testContainer,
  }) => {
    await app.page.reload();

    await app.page.waitForSelector("span[data-testid=loggedInStatus]");

    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.privateResource);

    expect(response).toBe(testContainer.privateFileText);
  });

  // eslint-disable-next-line playwright/expect-expect
  test.fixme("Non-existent resource in my Pod", async () => {});

  test("gets notified when session is extended", async ({ app }) => {
    // The session should expire after 6 minutes. The additional second is for margin.
    test.setTimeout(360_000 + 1000);
    await app.page.waitForSelector("span[data-testid=loggedInStatus]");

    // Wait for the session to expire
    const expirationDateString = await app.page
      .locator("span[data-testid=sessionExpiration]")
      .textContent();
    // This conditional doesn't impact test assertions.
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (expirationDateString === null) {
      throw new Error("Could not read expiration date.");
    }
    const expirationDate = Number.parseInt(expirationDateString, 10);
    await new Promise((resolve) => {
      // Wait for the session to expire, with a small error margin
      setTimeout(resolve, expirationDate - Date.now() + 500);
    });
    await expect(
      app.page.locator("[data-testid=extensionSignalReceived]").textContent(),
    ).resolves.toContain("Yes");
  });
});

test.describe("Using a Client ID", () => {
  test("can log in using a Client ID document", async ({
    auth,
    clientAccessControl,
    app,
  }) => {
    await app.page.waitForSelector("[data-testid=clientIdentifierInput]");
    // Type the Client ID before logging in, so that it is used during logging.
    await app.page.fill(
      "[data-testid=clientIdentifierInput]",
      clientAccessControl.clientId,
    );
    await auth.login({ allow: true });
    await app.page.waitForSelector("span[data-testid=loggedInStatus]");
    const successResponse = await app.fetchResource(
      clientAccessControl.clientResourceUrl,
    );
    // The resource content should be available, because it is fetched by an authorized client.
    expect(successResponse).toBe(clientAccessControl.clientResourceContent);

    // Try to log back in without using the Client Identifier, and verifies that it fails.
    await app.page.click(TESTID_SELECTORS.LOGOUT_BUTTON);
    // Enforce that we go through a full login again.
    await app.page.context().clearCookies();
    await app.page.fill("[data-testid=clientIdentifierInput]", "");
    await auth.login({ allow: true });

    await app.page.waitForSelector("span[data-testid=loggedInStatus]");
    const failureResponse = await app.fetchResource(
      clientAccessControl.clientResourceUrl,
    );
    // The resource content shouldn't be available to a dynamically registered client.
    expect(failureResponse).not.toBe(clientAccessControl.clientResourceContent);
    expect(failureResponse).toContain("403");
  });

  test("can prevent the session from extending", async ({
    auth,
    clientAccessControl,
    app,
  }) => {
    // The session should expire after 6 minutes. The additional second is for margin.
    test.setTimeout(360_000 + 1000);
    await app.page.waitForSelector("[data-testid=clientIdentifierInput]");
    // Type the Client ID before logging in, so that it is used during logging.
    await app.page.fill(
      "[data-testid=clientIdentifierInput]",
      clientAccessControl.clientId,
    );
    await auth.login({ allow: true });
    await app.page.waitForSelector("span[data-testid=loggedInStatus]");

    // Wait for the session to expire
    const expirationDateString = await app.page
      .locator("span[data-testid=sessionExpiration]")
      .textContent();
    // This conditional doesn't impact test assertions.
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (expirationDateString === null) {
      throw new Error("Could not read expiration date.");
    }
    const expirationDate = Number.parseInt(expirationDateString, 10);
    await new Promise((resolve) => {
      // Wait for the session to expire, with a small error margin
      setTimeout(resolve, expirationDate - Date.now() + 500);
    });
    await expect(
      app.page.locator("[data-testid=expirationSignalReceived]").textContent(),
    ).resolves.toContain("Yes");
  });

  test("The session should perform RP Initiated Logout correctly", async ({
    app,
    page,
    clientAccessControl,
    auth,
  }) => {
    const POST_LOGOUT_URL = `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`;

    await app.page.waitForSelector("[data-testid=clientIdentifierInput]");
    // Type the Client ID before logging in, so that it is used during logging.
    await app.page.fill(
      "[data-testid=clientIdentifierInput]",
      clientAccessControl.clientId,
    );

    await auth.login({ allow: true });

    expect(await app.isLoginSignalReceived()).toBe(true);
    expect(await app.getExpirationDate()).toBeGreaterThan(Date.now());

    await app.page.waitForSelector("[data-testid=postLogoutUrlInput]");
    await app.page.fill("[data-testid=postLogoutUrlInput]", POST_LOGOUT_URL);
    await page.click(`[data-testid=rpLogoutButton]`);
    await page.waitForURL(POST_LOGOUT_URL);
  });

  test("The session should perform RP Initiated Logout correctly with state", async ({
    app,
    page,
    clientAccessControl,
    auth,
  }) => {
    const POST_LOGOUT_URL = `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`;
    const state = v4();

    await app.page.waitForSelector("[data-testid=clientIdentifierInput]");
    // Type the Client ID before logging in, so that it is used during logging.
    await app.page.fill(
      "[data-testid=clientIdentifierInput]",
      clientAccessControl.clientId,
    );

    await auth.login({ allow: true });

    expect(await app.isLoginSignalReceived()).toBe(true);
    expect(await app.getExpirationDate()).toBeGreaterThan(Date.now());

    await app.page.waitForSelector("[data-testid=postLogoutUrlInput]");
    await app.page.fill("[data-testid=postLogoutUrlInput]", POST_LOGOUT_URL);

    await app.page.waitForSelector("[data-testid=stateInput]");
    await app.page.fill("[data-testid=stateInput]", state);

    await page.click(`[data-testid=rpLogoutButton]`);
    await page.waitForURL(`${POST_LOGOUT_URL}?state=${state}`);
  });

  test("The session should perform RP Initiated Logout redirecting to the home page with state", async ({
    app,
    page,
    clientAccessControl,
    auth,
  }) => {
    const POST_LOGOUT_URL = `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/`;
    const state = v4();

    await app.page.waitForSelector("[data-testid=clientIdentifierInput]");
    // Type the Client ID before logging in, so that it is used during logging.
    await app.page.fill(
      "[data-testid=clientIdentifierInput]",
      clientAccessControl.clientId,
    );

    await auth.login({ allow: true });

    expect(await app.isLoginSignalReceived()).toBe(true);
    expect(await app.getExpirationDate()).toBeGreaterThan(Date.now());

    await app.page.waitForSelector("[data-testid=postLogoutUrlInput]");
    await app.page.fill("[data-testid=postLogoutUrlInput]", POST_LOGOUT_URL);

    await app.page.waitForSelector("[data-testid=stateInput]");
    await app.page.fill("[data-testid=stateInput]", state);

    await page.click(`[data-testid=rpLogoutButton]`);
    await page.waitForURL(`${POST_LOGOUT_URL}?state=${state}`);
  });

  test("The session should perform RP Initiated Logout and not redirect to the app if postLogoutUrl is not provided", async ({
    app,
    page,
    clientAccessControl,
    auth,
  }) => {
    // Get the openId configuration
    const config = await fetch(
      new URL(".well-known/openid-configuration", env.idp),
    );
    const configuration = await config.json();

    await app.page.waitForSelector("[data-testid=clientIdentifierInput]");
    // Type the Client ID before logging in, so that it is used during logging.
    await app.page.fill(
      "[data-testid=clientIdentifierInput]",
      clientAccessControl.clientId,
    );

    await auth.login({ allow: true });

    expect(await app.isLoginSignalReceived()).toBe(true);
    expect(await app.getExpirationDate()).toBeGreaterThan(Date.now());

    await Promise.all([
      // Make sure the end session endpoint is requested at some point
      page.waitForRequest(configuration.end_session_endpoint),
      page.click(`[data-testid=rpLogoutButton]`),
    ]);

    // We should remain on the same origin as the end_session_endpoint if we do not provide
    // a URL to take us back to the original webpage
    await expect(page).toHaveURL(
      new RegExp(new URL(configuration.end_session_endpoint).origin),
    );
  });
});
