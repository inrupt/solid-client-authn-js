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

import { PlaywrightTestConfig } from "@playwright/test";

const env = () => (process.env.CI === "true" ? "in CI" : "locally");

const config: PlaywrightTestConfig = {
  testMatch: "*.playwright.ts",
  retries: 1,
  workers: process.env.CI ? 3 : 1,
  globalSetup: require.resolve("./globalSetup.ts"),
  // On CI we want to use the automatic annotations, otherwise we use list:
  reporter: process.env.CI ? "github" : "list",
  use: {
    headless: true,
    // Don't leak the env to the browser:
    // Comment out if not running headless browser
    launchOptions: {
      env: {},
    },
    // Screenshots actually don't give us any value when trying to debug:
    screenshot: "off",
    // On CI we want all the trace results, but in local development, you really
    // only want those for failures:
    trace: process.env.CI ? "on" : "retain-on-failure",
    video: process.env.CI ? "on" : "retain-on-failure",
  },
  // We need just a little more time on CI:
  timeout: process.env.CI ? 3 * 60_000 : 60_000,
  webServer: {
    command: "npm run start",
    port: 3001,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "Firefox",
      use: {
        browserName: "firefox",
        userAgent: `Browser-based solid-client-authn-browser end-to-end tests running ${env()}. Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0`,
      },
    },
    {
      name: "Chromium",
      use: {
        browserName: "chromium",
        userAgent: `Browser-based solid-client-authn-browser end-to-end tests running ${env()}. Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36`,
      },
    },
    // FIXME Logging in with Webkit fails with cognito.
    // {
    //   name: "WebKit",
    //   use: {
    //     browserName: "webkit",
    //     userAgent: `Browser-based solid-client-authn-browser end-to-end tests running ${env()}. Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1`,
    //   },
    // },
  ],
};

export default config;
