//
// Copyright 2022 Inrupt Inc.
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
import { Session } from "@inrupt/solid-client-authn-node";

const { argv } = require("yargs/yargs")(process.argv.slice(2))
  .describe("clientId", "The registered client ID.")
  .describe("clientSecret", "The secret associated with the client ID.")
  .describe(
    "oidcIssuer",
    "The identity provider that issued the token (i.e. the OIDC issuer)."
  )
  .describe("resource", "The resource to fetch")
  .demandOption(["clientId", "clientSecret", "oidcIssuer", "resource"])
  .locale("en")
  .help();

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
      .then(console.log)
      .then(() => session.logout())
      .catch(console.error);
  } else {
    console.log("Not logged in.");
  }
}

main().catch(console.error);
