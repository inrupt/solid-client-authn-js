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

// This file includes experimental API objects, which are camel cased.
/* eslint-disable camelcase */

import { test as base } from "@inrupt/internal-playwright-helpers";

import type { TestingEnvironmentNode } from "@inrupt/internal-test-env";
import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";
import { Session } from "@inrupt/solid-client-authn-node";
import {
  getPodUrlAll,
  saveFileInContainer,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import { AppPage } from "./pageModels/AppPage";

export { expect } from "@inrupt/internal-playwright-helpers";

export type Fixtures = {
  app: AppPage;
  testResource: { url: string; expectedContent: string };
  expectedWebid: string;
  setupEnvironment: TestingEnvironmentNode;
};

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    const app = new AppPage(page);

    await use(app);
  },

  // playwright expects the first argument to be a destructuring pattern.
  // eslint-disable-next-line no-empty-pattern
  setupEnvironment: async ({}, use) => {
    await use(getNodeTestingEnvironment());
  },

  testResource: async ({ setupEnvironment, page }, use) => {
    // Attempt to reduce the number of times we see invalid_request errors from session.login
    await page.waitForTimeout(100);
    // setup: build the container
    const session = new Session();

    try {
      if (
        setupEnvironment.clientCredentials.owner.type !==
        "ESS Client Credentials"
      ) {
        throw new Error("Unsupported client credentials");
      }
      await session.login({
        oidcIssuer: setupEnvironment.idp,
        clientId: setupEnvironment.clientCredentials.owner.id,
        clientSecret: setupEnvironment.clientCredentials.owner.secret,
        // DPoP is the default, but prints a warning on node.js that pollutes
        // the test output; we can do what we need with Bearer tokens.
        tokenType: "Bearer",
      });
    } catch (err) {
      throw new Error(`Failed to login: ${(err as Error).message}`);
    }

    if (!session.info.isLoggedIn || !session.info.webId) {
      throw new Error("Failed to login when creating test container");
    }

    const pods = await getPodUrlAll(session.info.webId, {
      fetch: session.fetch,
    });

    const resourceContent = "This is a plain piece of text";
    // Create the container:
    const testResource = await saveFileInContainer(
      // Usually there's only a single Pod URL on the test accounts, so this *should* be fine:
      pods[0],
      new Blob([resourceContent]),
      {
        fetch: session.fetch,
        contentType: "text/plain",
      },
    );

    await use({
      url: getSourceUrl(testResource),
      expectedContent: resourceContent,
    });

    // teardown: delete the container & files:
    await deleteFile(getSourceUrl(testResource), {
      fetch: session.fetch,
    });
    await session.logout();
  },
});
