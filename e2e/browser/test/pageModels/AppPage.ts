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
import type { Locator, Page } from "@playwright/test";

type AppPageOptions = {
  clientApplicationUrl: string;
  fetchTimeout: number;
};

export class AppPage {
  readonly page: Page;

  private readonly url: string;

  private readonly fetchTimeout: number;

  private readonly fetchResponseText: Locator;

  private readonly loginSignalReceived: Locator;

  private readonly logoutSignalReceived: Locator;

  private readonly expirationDate: Locator;

  constructor(page: Page, options: AppPageOptions) {
    this.page = page;
    this.url = options.clientApplicationUrl;
    this.fetchTimeout = options.fetchTimeout;

    this.fetchResponseText = this.page.locator(
      '[data-testid="fetchResponseTextbox"]',
    );
    this.loginSignalReceived = this.page.locator(
      '[data-testid="loginSignalReceived"]',
    );
    this.logoutSignalReceived = this.page.locator(
      '[data-testid="loginSignalReceived"]',
    );
    this.expirationDate = this.page.locator(
      '[data-testid="sessionExpiration"]',
    );
  }

  async fetchResource(url: string) {
    await this.page.fill('[data-testid="fetchUriTextbox"]', url);
    await Promise.all([
      this.page.click('[data-testid="fetchButton"]'),
      // A response should be sent to the issued fetch.
      this.page.waitForResponse((response) =>
        response.url().includes(new URL(url).href),
      ),
    ]);

    // We use waitFor here, as now when we click the "fetch button", the
    // response textbox element will be removed from the DOM whilst the response
    // is loaded:
    await this.fetchResponseText.waitFor({ timeout: this.fetchTimeout });

    // Return the response to make testing less verbose:
    return this.getFetchResponse();
  }

  async getFetchResponse() {
    return this.fetchResponseText.textContent();
  }

  async isLoginSignalReceived(): Promise<boolean> {
    const loginSignalText = await this.loginSignalReceived.textContent();
    return loginSignalText === "Yes";
  }

  async isLogoutSignalReceived(): Promise<boolean> {
    const logoutSignalText = await this.logoutSignalReceived.textContent();
    return logoutSignalText === "Yes";
  }

  async getExpirationDate(): Promise<number> {
    const expirationDateText = await this.expirationDate.textContent();
    if (expirationDateText === null) {
      throw new Error("No expiration date found.");
    }
    return Number.parseInt(expirationDateText, 10);
  }
}
