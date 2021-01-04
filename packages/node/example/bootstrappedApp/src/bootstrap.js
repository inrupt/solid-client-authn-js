/*
 * Copyright 2021 Inrupt Inc.
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

// The only import we need from the Node AuthN library is the Session class.
const { Session } = require("../../../dist/Session");
const { InMemoryStorage } = require("@inrupt/solid-client-authn-core");

const argv = require("yargs/yargs")(process.argv.slice(2))
  .describe(
    "oidcIssuer",
    "The identity provider at which the user should authenticate."
  )
  .alias("issuer", "oidcIssuer")
  .describe("clientName", "The name of the bootstrapped app.")
  .demandOption(["oidcIssuer"])
  .locale("en")
  .help().argv;

const express = require("express");
const app = express();
const PORT = 3001;
const iriBase = `http://localhost:${PORT}`;
const storage = new InMemoryStorage();

// Initialised when the server comes up and is running...
let session;
let server;

app.get("/", async (_req, res) => {
  console.log("Login successful.");
  await session.handleIncomingRedirect(`${iriBase}${_req.url}`);
  // NB: This is a temporary approach, and we have work planned to properly
  // collect the token. Please note that the next line is not part of the public
  // API, and is therefore likely to break on non-major changes.
  const rawStoredSession = await storage.get(
    `solidClientAuthenticationUser:${session.info.sessionId}`
  );
  const storedSession = JSON.parse(rawStoredSession);
  console.log(`\nRefresh token: [${storedSession.refreshToken}]`);
  console.log(`Client ID: [${storedSession.clientId}]`);
  console.log(`Client Secret: [${storedSession.clientSecret}]`);

  res.send(
    "The tokens have been sent to the bootstraping app. You can close this window."
  );
  server.close();
});

server = app.listen(PORT, async () => {
  session = new Session({
    insecureStorage: storage,
    secureStorage: storage,
  });

  console.log(`Listening at: [http://localhost:${PORT}].`);
  console.log(`Logging in ${argv.oidcIssuer} to get a refresh token.`);
  session.login({
    clientName: argv.clientName,
    oidcIssuer: argv.oidcIssuer,
    redirectUrl: iriBase,
    tokenType: "DPoP",
    handleRedirect: (url) => {
      console.log(`\nPlease visit ${url} in a web browser.\n`);
    },
  });
});
