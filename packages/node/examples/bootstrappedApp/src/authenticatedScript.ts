import { Session } from "@inrupt/solid-client-authn-node";

const argv = require("yargs/yargs")(process.argv.slice(2))
  .describe("clientId", "The registered client ID.")
  .describe("clientSecret", "The secret associated with the client ID.")
  .describe(
    "oidcIssuer",
    "The identity provider that issued the token (i.e. the OIDC issuer)."
  )
  .describe("resource", "The resource to fetch")
  .demandOption(["clientId", "clientSecret", "oidcIssuer", "resource"])
  .locale("en")
  .help().argv;

async function main(): Promise<void> {
  const session = new Session();
  await session.login({
    clientId: argv.clientId,
    clientSecret: argv.clientSecret,
    oidcIssuer: argv.oidcIssuer,
  });
  if (session.info.isLoggedIn) {
    session
      .fetch(argv.resource)
      .then((response) => {
        return response.text();
      })
      .then(console.log);
    session.logout();
  } else {
    console.log("Not logged in.");
  }
}

main();
