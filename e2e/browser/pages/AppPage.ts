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
import { expect, Locator, Page } from "@playwright/test";

type AppPageOptions = {
  clientApplicationUrl: string;
  fetchTimeout: number;
};

export class AppPage {
  readonly page: Page;

  private readonly url: string;

  private readonly fetchTimeout: number;

  private readonly fetchResponseText: Locator;

  constructor(page: Page, options: AppPageOptions) {
    this.page = page;
    this.url = options.clientApplicationUrl;
    this.fetchTimeout = options.fetchTimeout;

    this.fetchResponseText = this.page.locator(
      '[data-testid="fetch_response_textbox"]'
    );
  }

  async start() {
    await this.page.goto(this.url);
  }

  async waitForReady() {
    return this.page.waitForURL(this.url);
  }

  // async disableReauthorize() {
  //   return this.page.uncheck('[data-testid="login_reauthorize"]');
  // }

  async startLogin(url: string) {
    await this.page.fill('[data-testid="idp_input"]', url);

    // Click the login button:
    await this.page.click('[data-testid="idp_login_button"]');
    await this.page.waitForNavigation({
      waitUntil: "networkidle",
    });
  }

  async fetchResource(url: string) {
    await this.page.fill('[data-testid="fetch_uri_textbox"]', url);
    await this.page.click('[data-testid="fetch_button"]');

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
}
