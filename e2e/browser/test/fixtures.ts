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

import { randomUUID } from "crypto";
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
  createThing,
  getPodUrlAll,
  deleteContainer,
  saveFileInContainer,
  getSourceUrl,
  getSolidDataset,
  saveSolidDatasetAt,
  getThing,
  getUrlAll,
  access_v1,
  access_v2,
  deleteFile,
  createContainerInContainer,
  overwriteFile,
  universalAccess,
  buildThing,
  setThing,
} from "@inrupt/solid-client";
import LinkHeaders from "http-link-header";
import { PLAYWRIGHT_PORT } from "../../../playwright.config";
import { AppPage } from "./pageModels/AppPage";

export { expect } from "@inrupt/internal-playwright-helpers";

export type Fixtures = {
  app: AppPage;
  testContainer: TestContainer;
  environment: TestingEnvironmentBrowser;
  setupEnvironment: TestingEnvironmentNode;
  clientAccessControl: {
    clientId: string;
    clientResourceUrl: string;
    clientResourceContent: string;
  };
  noSessionExtension: {
    clientId: string;
  };
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

const createClientIdDoc = async (
  clientInfo: {
    clientName: string;
    redirectUrl: string;
    scope?: string;
  },
  container: string,
  session: Session
): Promise<string> => {
  const emptyClientIdDoc = await saveFileInContainer(
    container,
    Buffer.from([]),
    {
      contentType: "application/json",
      fetch: session.fetch,
    }
  );
  const clientId = getSourceUrl(emptyClientIdDoc);
  const clientIdDoc = {
    "@context": ["https://www.w3.org/ns/solid/oidc-context.jsonld"],
    client_name: clientInfo.clientName,
    client_id: clientId,
    redirect_uris: [clientInfo.redirectUrl],
    // Note: No refresh token will be issued by default. If the tests last too long, this
    // should be updated so that it has the offline_access scope and supports the
    // refresh_token grant type.
    scope: clientInfo.scope ?? "openid webid",
    grant_types: ["authorization_code"],
    response_types: ["code"],
    post_logout_redirect_uris: [
      "http://localhost:3001/postLogoutUrl",
      "http://localhost:3001/",
    ],
  };
  await overwriteFile(clientId, Buffer.from(JSON.stringify(clientIdDoc)), {
    fetch: session.fetch,
  });

  // The Client Identifier Document should be public.
  const { setPublicAccess } = universalAccess;
  await setPublicAccess(
    clientId,
    { read: true, write: false },
    { fetch: session.fetch } // fetch function from authenticated session
  );
  return clientId;
};

const createClientResource = async (
  container: string,
  content: string,
  clientId: string,
  session: Session
): Promise<string> => {
  const clientResource = await saveFileInContainer(
    container,
    Buffer.from(content),
    {
      contentType: "application/json",
      fetch: session.fetch,
    }
  );
  const resourceUrl = getSourceUrl(clientResource);

  // Adding client access control restrictions on a Resource isn't part of the
  // high-level API yet.
  const headResponse = await session.fetch(resourceUrl, {
    method: "HEAD",
  });
  const responseLinks = headResponse.headers.get("Link");
  if (responseLinks === null) {
    throw new Error("Could not find links to the resource's ACR.");
  }
  const links = LinkHeaders.parse(responseLinks.toString());
  const acrUrl = links.get("rel", "acl")[0].uri;
  // Fetch the ACR, and add a matcher to match the given client ID.
  const acrDataset = await getSolidDataset(acrUrl, { fetch: session.fetch });
  const acrThing = getThing(acrDataset, acrUrl);
  if (acrThing === null) {
    throw new Error(
      `The ACR ${acrUrl} doens't have a subject matching its own URL.`
    );
  }
  const applicableAccessControls = getUrlAll(
    acrThing,
    "http://www.w3.org/ns/solid/acp#accessControl"
  );
  if (applicableAccessControls.length === 0) {
    throw new Error(`ACR ${acrUrl} has no applicable Access Control.`);
  }
  const clientMatcherUri = new URL(randomUUID(), acrUrl).href;
  const clientMatcher = buildThing({ url: clientMatcherUri })
    .addUrl("http://www.w3.org/ns/solid/acp#client", clientId)
    .build();
  const publicClientMatcherUri = new URL(randomUUID(), acrUrl).href;
  const publicClientMatcher = buildThing({ url: publicClientMatcherUri })
    .addUrl(
      "http://www.w3.org/ns/solid/acp#client",
      "http://www.w3.org/ns/solid/acp#PublicClient"
    )
    .build();
  const clientPolicyUri = new URL(randomUUID(), acrUrl).href;
  // Deny access to all but the Client Identifier
  const clientPolicy = buildThing({ url: clientPolicyUri })
    .addUrl(
      "http://www.w3.org/ns/solid/acp#deny",
      "http://www.w3.org/ns/auth/acl#Read"
    )
    .addUrl("http://www.w3.org/ns/solid/acp#anyOf", publicClientMatcher)
    .addUrl("http://www.w3.org/ns/solid/acp#noneOf", clientMatcherUri)
    .build();

  const accessControlThing = buildThing(
    getThing(acrDataset, applicableAccessControls[0]) ??
      createThing({ url: applicableAccessControls[0] })
  )
    .addUrl("http://www.w3.org/ns/solid/acp#apply", clientPolicyUri)
    .build();
  const updatedAcr = [
    accessControlThing,
    clientPolicy,
    clientMatcher,
    publicClientMatcher,
  ].reduce(setThing, acrDataset);
  await saveSolidDatasetAt(acrUrl, updatedAcr, {
    fetch: session.fetch,
  });
  return resourceUrl;
};

// This is the deployed client application that we'll be using to exercise
// various authentication scenarios. We expect the system environment value to
// point at a deployed instance (e.g. an automated Vercel deployment), but I
// don't think it makes sense to default to a hard-coded Vercel instance.
// Instead, for running locally, it seems helpful to default to 'localhost'
// instance.
const clientApplicationUrl =
  process.env.E2E_DEMO_CLIENT_APP_URL ?? "http://localhost:3001/";

export async function seedPod(setupEnvironment: TestingEnvironmentNode) {
  if (
    setupEnvironment.clientCredentials.owner.type !== "ESS Client Credentials"
  ) {
    throw new Error("Unsupported client credentials");
  }

  const credentials = {
    oidcIssuer: setupEnvironment.idp,
    clientId: setupEnvironment.clientCredentials.owner.id,
    clientSecret: setupEnvironment.clientCredentials.owner.secret,
  };

  // Make the Client ID document publicly available.
  const session = new Session();
  session.events.on("sessionExpired", async () => {
    await session.login(credentials);
  });

  try {
    await session.login(credentials);
  } catch (err) {
    throw new Error(`Failed to login: ${(err as Error).message}`);
  }

  if (typeof session.info.webId !== "string") {
    throw new Error("The provided session isn't logged in.");
  }
  const parentContainers = await getPodUrlAll(session.info.webId);
  if (parentContainers.length === 0) {
    throw new Error(`Couldn't find storage for ${session.info.webId}`);
  }
  const [podRoot] = parentContainers;

  const clientId = await createClientIdDoc(
    {
      clientName: "Browser test app",
      redirectUrl: new URL(`http://localhost:${PLAYWRIGHT_PORT}`).href,
    },
    podRoot,
    session
  );
  const clientResourceContent =
    "Access to this file is restricted to a specific client.";
  const clientResourceUrl = await createClientResource(
    podRoot,
    clientResourceContent,
    clientId,
    session
  );

  return {
    clientId,
    clientResourceContent,
    clientResourceUrl,
    session,
  };
}

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
            login: true,
            password: true,
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

    const nonExistentResource = new URL(
      `${randomUUID()}.txt`,
      getSourceUrl(testContainer)
    ).href;

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

  clientAccessControl: async ({ setupEnvironment }, use) => {
    const { session, clientId, clientResourceUrl, clientResourceContent } =
      await seedPod(setupEnvironment);
    // The code before the call to use is the setup, and after is the teardown.
    // This is the value the Fixture will be using.
    await use({ clientId, clientResourceUrl, clientResourceContent });

    // Teardown
    await deleteFile(clientId, {
      fetch: session.fetch,
    });

    await deleteFile(clientResourceUrl, {
      fetch: session.fetch,
    });

    await session.logout();
  },
});
