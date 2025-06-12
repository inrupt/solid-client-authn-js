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

// The following is a CLI script, so some regular linting rules don't apply.

import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv-flow";
import {
  deleteContainer,
  deleteFile,
  getContainedResourceUrlAll,
  getPodUrlAll,
  getSolidDataset,
} from "@inrupt/solid-client";
import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";

config({
  path: __dirname.concat("/../../env/"),
  // Disable warning messages in CI
  silent: process.env.CI === "true",
});

async function run() {
  const environment = getNodeTestingEnvironment({
    clientCredentials: {
      owner: {
        id: "",
        secret: "",
      },
    },
  });
  const session = new Session();

  await session.login({
    oidcIssuer: environment.idp,
    clientId: environment.clientCredentials.owner.id,
    clientSecret: environment.clientCredentials.owner.secret,
  });

  // Empty line to make output separate from the DPoP DraftWarning
  console.log("");

  if (!session.info.isLoggedIn || typeof session.info.webId !== "string") {
    throw new Error("Failed to login when creating test container");
  }

  const pods = await getPodUrlAll(session.info.webId, {
    fetch: session.fetch,
  });

  // Usually there's only a single Pod URL on the test accounts, so this *should* be fine:
  const rootContainer = pods[0];

  const dataset = await getSolidDataset(rootContainer, {
    fetch: session.fetch,
  });

  const containers = getContainedResourceUrlAll(dataset).filter(
    (containerUrl) => /[a-f0-9]{32}/.test(containerUrl),
  );

  console.log(`Found ${containers.length} test containers!`);

  for (const containerUrl of containers) {
    console.log(`Attempting to delete container: ${containerUrl}`);

    const container = await getSolidDataset(containerUrl, {
      fetch: session.fetch,
    });

    const containedResources = getContainedResourceUrlAll(container);

    if (containedResources.every((url) => url.endsWith(".txt"))) {
      await Promise.all(
        containedResources.map(async (url) => {
          return deleteFile(url, { fetch: session.fetch });
        }),
      );

      await deleteContainer(containerUrl, { fetch: session.fetch });

      console.log(`Deleted container: ${containerUrl}`);
    } else {
      console.log("Error: container contains more than expected, not deleting");
    }
  }
}

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
run()
  .catch(console.error.bind(console))
  .then(() => process.exit());
