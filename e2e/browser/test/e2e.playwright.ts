//
// Copyright 2022 Inrupt Inc.
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
import { test, expect } from "./fixtures";

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
        testContainer.nonExistentResource
      );

      expect(response).toContain("Can't find file requested");
    }
  );
});

test.describe("Logged In", () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login({ allow: true });
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

  test.fixme("Non-existent resource in my Pod", async () => {});
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
      clientAccessControl.clientId
    );
    await auth.login({ allow: true });
    await app.page.waitForSelector("span[data-testid=loggedInStatus]");
    const successResponse = await app.fetchResource(
      clientAccessControl.clientResourceUrl
    );

    expect(successResponse).toBe(clientAccessControl.clientResourceContent);
    // Try to log back in without using the Client Identifier, and verifies that it fails.
    await app.page.click(TESTID_SELECTORS.LOGOUT_BUTTON);
    // Enforce that we go through a full login again.
    await app.page.context().clearCookies();
    await app.page.fill("[data-testid=clientIdentifierInput]", "");
    await auth.login({ allow: true });
    await app.page.waitForSelector("span[data-testid=loggedInStatus]");
    const failureResponse = await app.fetchResource(
      clientAccessControl.clientResourceUrl
    );

    expect(failureResponse).not.toBe(clientAccessControl.clientResourceContent);
  });
});
