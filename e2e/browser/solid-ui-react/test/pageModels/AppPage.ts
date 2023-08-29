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

export class AppPage {
  readonly page: Page;

  private readonly resourceUrl: Locator;

  private readonly resourceContent: Locator;

  private readonly webIdContent: Locator;

  private readonly fetchButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.resourceUrl = this.page.locator('input[id="resourceInput"]');
    this.resourceContent = this.page.locator('div[id="data"]');
    this.webIdContent = this.page.locator('div[id="webId"]');
    this.fetchButton = this.page.locator('[data-testid="fetchButton"]');
  }

  async home() {
    await this.page.goto("http://localhost:3001");
  }

  async sampleRequest() {
    await this.resourceUrl.fill("http://localhost:3001/api/data");
    await Promise.all([
      this.fetchButton.click(),
      // A response should be sent to the issued fetch.
      this.page.waitForResponse((response) => response.status() === 200),
    ]);

    return this.resourceContent.textContent();
  }

  async fetchResource(url: string) {
    await this.resourceUrl.fill(url);
    await Promise.all([
      this.fetchButton.click(),
      // A response should be sent to the issued fetch.
      this.page.waitForResponse((response) =>
        response.url().includes(new URL(url).href),
      ),
    ]);

    return this.resourceContent.textContent();
  }

  async getWebid() {
    return this.webIdContent.textContent();
  }
}
