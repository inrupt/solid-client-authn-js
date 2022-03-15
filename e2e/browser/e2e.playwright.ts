/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { test, expect } from "./fixtures";
import { LoginFlow } from "./pages/LoginFlow";

// TODO: Redirected resource tests? I'm not sure what those actually show

test.describe.parallel("Not Logged In", () => {
  test("Public resource in my Pod", async ({ testContainer, app }) => {
    await app.start();

    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.publicResource);

    expect(response).toBe(testContainer.publicFileText);
  });

  test("Private resource in my Pod", async ({ testContainer, app }) => {
    await app.start();

    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.privateResource);

    expect(response).toContain("401");
    expect(response).toContain("Unauthorized");
  });

  // FIXME: This doesn't actually currently work as we don't know if the file exists or not as we get a 401:
  test.fixme(
    "Non-existent resource in my Pod",
    async ({ testContainer, app }) => {
      await app.start();

      expect(await app.getFetchResponse()).toBe("not fetched");

      const response = await app.fetchResource(
        testContainer.nonExistentResource
      );

      expect(response).toContain("Can't find file requested");
    }
  );
});

test.describe.parallel("Logged In", () => {
  test.beforeEach(async ({ app, page, environment }) => {
    await app.start();
    await app.waitForReady();
    await app.startLogin(environment.idp);

    const login = new LoginFlow(page, environment);

    await login.perform(environment.username, environment.password);
    await login.approveAuthorization();
  });

  test("Public resource in my Pod", async ({ app, testContainer }) => {
    // The app is started in the beforeEach:
    await app.waitForReady();

    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.publicResource);

    expect(response).toBe(testContainer.publicFileText);
  });

  test("Private resource in my Pod", async ({ app, testContainer }) => {
    // The app is started in the beforeEach:
    await app.waitForReady();

    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.privateResource);

    expect(response).toBe(testContainer.privateFileText);
  });

  test("Private resource in my Pod, after refresh (using auto-login)", async ({
    app,
    testContainer,
  }) => {
    // The app is started in the beforeEach:
    await app.waitForReady();
    await app.page.reload();

    await app.waitForReady();

    expect(await app.getFetchResponse()).toBe("not fetched");

    const response = await app.fetchResource(testContainer.privateResource);

    expect(response).toBe(testContainer.privateFileText);
  });

  test.fixme("Non-existent resource in my Pod", async () => {});
});
