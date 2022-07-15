import { getTestingEnvironment } from "../../setup/e2e-setup";
import { Session } from "@rubensworks/solid-client-authn-node";

import { config } from "dotenv-flow";
import {
  deleteContainer,
  deleteFile,
  getContainedResourceUrlAll,
  getPodUrlAll,
  getSolidDataset,
  getSourceUrl,
  getThingAll,
  getUrlAll,
  solidDatasetAsMarkdown,
} from "@inrupt/solid-client";
import { ldp, solid } from "@inrupt/solid-client/dist/constants";

config({
  path: __dirname.concat("/../../env/"),
  // Disable warning messages in CI
  silent: process.env.CI === "true",
});

async function run() {
  const environment = getTestingEnvironment();
  const session = new Session();

  await session.login({
    oidcIssuer: environment.idp,
    clientId: environment.clientId,
    clientSecret: environment.clientSecret,
  });

  // Empty line to make output separate from the DPoP DraftWarning
  console.log("");

  if (!session.info.isLoggedIn) {
    throw new Error("Failed to login when creating test container");
  }

  const pods = await getPodUrlAll(session.info.webId!, {
    fetch: session.fetch,
  });

  // Usually there's only a single Pod URL on the test accounts, so this *should* be fine:
  const rootContainer = pods[0];

  const dataset = await getSolidDataset(rootContainer, {
    fetch: session.fetch,
  });

  const containers = getContainedResourceUrlAll(dataset).filter(
    (containerUrl) => /[a-f0-9]{32}/.test(containerUrl)
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
        })
      );

      await deleteContainer(containerUrl, { fetch: session.fetch });

      console.log(`Deleted container: ${containerUrl}`);
    } else {
      console.log("Error: container contains more than expected, not deleting");
    }
  }
}

run()
  .catch(console.error.bind(console))
  .then(() => process.exit());
