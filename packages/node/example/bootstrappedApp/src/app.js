const { Session } = require("../../../dist/Session");

const argv = require("yargs/yargs")(process.argv.slice(2))
  .describe("clientId", "The registered client ID.")
  .alias("id", "clientId")
  .describe("clientSecret", "The secret associated to the client ID.")
  .help().argv;

const session = new Session();
session.login({});
