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

// This file includes experimental API objects, which are camel cased.
/* eslint-disable camelcase */

import { test as base } from "@playwright/test";

import crypto from "crypto";
import type {
  TestingEnvironmentBrowser,
  TestingEnvironmentNode,
} from "@inrupt/internal-test-env";
import {
  getNodeTestingEnvironment,
  getBrowserTestingEnvironment,
} from "@inrupt/internal-test-env";
import { Session } from "@inrupt/solid-client-authn-node";
import {
  getPodUrlAll,
  deleteContainer,
  saveFileInContainer,
  getSourceUrl,
  access_v1,
  access_v2,
  deleteFile,
  createContainerInContainer,
} from "@inrupt/solid-client";
import { AppPage } from "./pages/AppPage";

export { expect } from "@playwright/test";

export type Fixtures = {
  app: AppPage;
  testContainer: TestContainer;
  environment: TestingEnvironmentBrowser;
  setupEnvironment: TestingEnvironmentNode;
};

export type TestContainer = {
  url: string;
  publicResource: string;
  privateResource: string;
  nonExistentResource: string;
  publicFileText: string;
  privateFileText: string;
};

const saveTextFile = async (options: {
  name: string;
  contents: string;
  containerUrl: string;
  session: Session;
}): Promise<string> => {
  const data = Buffer.from(options.contents, "utf-8");

  const file = await saveFileInContainer(options.containerUrl, data, {
    slug: options.name,
    contentType: "text/plain",
    fetch: options.session.fetch,
  });

  const url = getSourceUrl(file);

  return url;
};

// This is the deployed client application that we'll be using to exercise
// various authentication scenarios. We expect the system environment value to
// point at a deployed instance (e.g. an automated Vercel deployment), but I
// don't think it makes sense to default to a hard-coded Vercel instance.
// Instead, for running locally, it seems helpful to default to 'localhost'
// instance.
const clientApplicationUrl =
  process.env.E2E_DEMO_CLIENT_APP_URL ?? "http://localhost:3001/";

// Extend basic test by providing a "defaultItem" option and a "todoPage" fixture.
export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    const app = new AppPage(page, {
      clientApplicationUrl,
      fetchTimeout: 2000,
    });

    await use(app);
  },

  // playwright expects the first argument to be a destructuring pattern.
  // eslint-disable-next-line no-empty-pattern
  environment: async ({}, use) => {
    await use(
      getBrowserTestingEnvironment({
        clientCredentials: {
          owner: {
            // Check that username and password are well-defined
            login: "",
            password: "",
          },
        },
      })
    );
  },

  // playwright expects the first argument to be a destructuring pattern.
  // eslint-disable-next-line no-empty-pattern
  setupEnvironment: async ({}, use) => {
    await use(getNodeTestingEnvironment());
  },

  testContainer: async ({ setupEnvironment, page }, use, testInfo) => {
    // Attempt to reduce the number of times we see invalid_request errors from session.login
    await page.waitForTimeout(100);
    // setup: build the container
    const session = new Session();

    try {
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

    // Create the container:
    const testContainer = await createContainerInContainer(
      // Usually there's only a single Pod URL on the test accounts, so this *should* be fine:
      pods[0],
      {
        fetch: session.fetch,
      }
    );

    const testContainerUrl = getSourceUrl(testContainer);

    const publicFileText = "This is a publicly readable file";
    const publicFileUrl = await saveTextFile({
      name: "public.txt",
      contents: publicFileText,
      containerUrl: testContainerUrl,
      session,
    });

    const privateFileText = `This is a private file, only readable by ${session.info.webId}`;
    const privateFileUrl = await saveTextFile({
      name: "private.txt",
      contents: privateFileText,
      containerUrl: testContainerUrl,
      session,
    });

    const { setPublicAccess, setAgentAccess } =
      setupEnvironment.environment === "ESS PodSpaces" ? access_v1 : access_v2;

    await setPublicAccess(
      publicFileUrl,
      { read: true, write: false },
      { fetch: session.fetch } // fetch function from authenticated session
    );

    await setAgentAccess(
      privateFileUrl,
      session.info.webId,
      { read: true, write: true },
      { fetch: session.fetch }
    );

    const nonExistentResource = `${getSourceUrl(testContainer)}/${crypto
      .randomBytes(16)
      .toString("hex")}.txt`;

    // The code before the call to use is the setup, and after is the teardown.
    // This is the value the Fixture will be using.
    await use({
      url: getSourceUrl(testContainer),
      publicResource: publicFileUrl,
      privateResource: privateFileUrl,
      nonExistentResource,
      publicFileText,
      privateFileText,
    });

    // If the test failed, and KEEP_TEST_DATA is set, then don't cleanup test data:
    // You'll need to use `npm run clean:testdata` instead
    if (
      testInfo.status !== testInfo.expectedStatus &&
      process.env.KEEP_TEST_DATA === "1"
    ) {
      return;
    }

    // teardown: delete the container & files:
    await deleteFile(publicFileUrl, {
      fetch: session.fetch,
    });

    await deleteFile(privateFileUrl, {
      fetch: session.fetch,
    });

    await deleteContainer(testContainerUrl, {
      fetch: session.fetch,
    });

    await session.logout();
  },
});
