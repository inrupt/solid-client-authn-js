/*
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
import { expect, Page } from "@playwright/test";
import { TestingEnvironmentBrowser } from "@inrupt/internal-test-env";

export class LoginFlow {
  readonly page: Page;

  private readonly env: TestingEnvironmentBrowser;

  constructor(page: Page, environment: TestingEnvironmentBrowser) {
    this.page = page;
    this.env = environment;
  }

  async perform(username: string, password: string) {
    const currentUrl = new URL(this.page.url());
    // amazoncognito is for 1.2, inrupt.com for 1.1
    if (
      currentUrl.hostname.includes("amazoncognito") ||
      currentUrl.hostname.includes("inrupt.com")
    ) {
      return this.performCognitoLogin(username, password);
    }
    if (currentUrl.hostname.endsWith("inrupt.net")) {
      return this.performNssLogin(username, password);
    }
    throw new Error("Unknown login type");
  }

  // FIXME: NSS can't be tested because the whole e2e setup can't execute on NSS:
  private async performNssLogin(username: string, password: string) {
    // console.log("Performing nss login");

    await this.page.fill("#username", username);
    await this.page.fill("#password", password);

    await Promise.all([
      // Cognito does a synchronous navigation:
      this.page.waitForNavigation({
        waitUntil: "networkidle",
      }),
      // Click the login button:
      this.page.click("#login"),
    ]);
  }

  private async performCognitoLogin(username: string, password: string) {
    // Check to ensure that the large login form is visible, apparently there are multiple:
    expect(this.page.isVisible(".visible-lg [type=text]")).toBeTruthy();

    await this.page.fill(".visible-lg [type=text]", username);
    await this.page.fill(".visible-lg [type=password]", password);

    await Promise.all([
      // Cognito does a synchronous navigation:
      this.page.waitForNavigation({
        waitUntil: "networkidle",
      }),
      // Click the login button:
      this.page.click(".visible-lg [aria-label=submit]"),
    ]);
  }

  async approveAuthorization() {
    // FIXME: should there be a validation here that we are actually on the brokers page?

    const approveButtonSelector = 'button[form="approve"]';

    // Check we really do have the approve button:
    expect(this.page.isVisible(approveButtonSelector)).toBeTruthy();

    await this.page.click(approveButtonSelector);

    // For some reason doing this the recommended way (by installing the handler
    // before triggering the button click), fails in Safari:
    await this.page.waitForNavigation({
      waitUntil: "networkidle",
    });
  }
}
