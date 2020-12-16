const { Session } = require("../../../dist/Session");

const argv = require("yargs/yargs")(process.argv.slice(2))
  .describe("clientId", "The registered client ID.")
  .alias("id", "clientId")
  .describe("clientSecret", "The secret associated with the client ID.")
  .alias("secret", "clientSecret")
  .describe(
    "refreshToken",
    "The OAuth refresh token (in our case, can be thought of as an API token)."
  )
  .describe(
    "oidcIssuer",
    "The identity provider that issued the token (i.e. the OIDC issuer)."
  )
  .alias("oidcIssuer", "issuer")
  .describe("resource", "The resource to fetch")
  .demandOption([
    "clientId",
    "clientSecret",
    "refreshToken",
    "oidcIssuer",
    "resource",
  ])
  .locale("en")
  .help().argv;

async function main() {
  const session = new Session();
  await session.login({
    clientId: argv.clientId,
    clientSecret: argv.clientSecret,
    refreshToken: argv.refreshToken,
    oidcIssuer: argv.oidcIssuer,
  });
  if (session.info.isLoggedIn) {
    session
      .fetch(argv.resource)
      .then((response) => {
        return response.text();
      })
      .then(console.log);
  } else {
    console.log("Not logged in.");
  }
}

main();
