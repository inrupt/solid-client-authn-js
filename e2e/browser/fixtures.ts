import { test as base } from "@playwright/test";
export { expect } from "@playwright/test";

import crypto from "crypto";

import { getTestingEnvironment, TestingEnvironment } from "../setup/e2e-setup";
import { Session } from "@inrupt/solid-client-authn-node";
import {
  getPodUrlAll,
  createContainerAt,
  deleteContainer,
  saveFileInContainer,
  getSourceUrl,
  access,
  deleteFile,
} from "@inrupt/solid-client";
import { AppPage } from "./pages/AppPage";

const { setPublicAccess, setAgentAccess } = access;

export type Options = {};
export type Fixtures = {
  app: AppPage;
  testContainer: TestContainer;
  environment: TestingEnvironment;
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
  app: ({ page }, use) => {
    const app = new AppPage(page, {
      clientApplicationUrl,
      fetchTimeout: 2000,
    });

    use(app);
  },

  environment: ({}, use) => {
    use(getTestingEnvironment(true));
  },

  testContainer: async ({ environment, page }, use, testInfo) => {
    // Attempt to reduce the number of times we see invalid_request errors from session.login
    await page.waitForTimeout(100);
    // setup: build the container
    const session = new Session();

    try {
      await session.login({
        oidcIssuer: environment.idp,
        clientId: environment.clientId,
        clientSecret: environment.clientSecret,
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

    // Usually there's only a single Pod URL on the test accounts, so this *should* be fine:
    const rootContainer = pods[0];

    // Generating a long random container identifier to prevent conflicts between tests:
    const testContainerId = crypto.randomBytes(16).toString("hex");

    // Create the container:
    const testContainer = await createContainerAt(
      rootContainer + testContainerId + "/",
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

    const nonExistentResource =
      rootContainer +
      testContainerId +
      "/" +
      crypto.randomBytes(16).toString("hex") +
      ".txt";

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
