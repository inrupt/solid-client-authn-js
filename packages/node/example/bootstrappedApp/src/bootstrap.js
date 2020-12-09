/*
 * Copyright 2020 Inrupt Inc.
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
const express = require("express");
const app = express();
const PORT = 3001;
const iriBase = `http://localhost:${PORT}`;
const storage = new InMemoryStorage();

// Initialised when the server comes up and is running...
let session;
let server;
const identity = {};

const issuers = [
  "https://broker.pod.inrupt.com",
  /** add other issuers here as they become available
   *   uncomment these when NSS supports this cookie retrieval
   *     "https://inrupt.net",
   *     "https://solidcommunity.net",
   *     "https://solidWeb.org",
   */
  "Other",
];

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
  identity.token = storedSession.refreshToken;
  identity.clientId = storedSession.clientId;
  identity.clientSecret = storedSession.clientSecret;
  console.log(`
The code below allows entry to your pod, do not share it with anyone.
You probably want to store this in an (encrypted) JSON file for reuse
in a call to login() in your scripts and apps.
`);
  console.log(JSON.stringify(identity));

  res.send(
    "The tokens have been sent to the bootstraping app. You can close this window."
  );
  server.close();
});

server = app.listen(PORT, async () => {
  const rl = require("readline-sync");
  identity.oidcIssuer = (() => {
    const index = rl.keyInSelect(issuers, "Identity Provider (oidcIssuer) ?");
    if (index === issuers.length - 1) {
      return rl.question("Other Identity Provider? ");
    }
    if (index === -1) {
      console.log("No Identity Provider supplied!\n");
      process.exit();
    }
    return issuers[index];
  })();
  identity.clientName = (() => {
    return rl.question(`User Name (clientName) ? `);
  })();

  session = new Session({
    insecureStorage: storage,
    secureStorage: storage,
  });

  console.log(`Listening at: [http://localhost:${PORT}].`);
  console.log(`Logging in ${identity.oidcIssuer} to get a refresh token.`);
  session.login({
    clientName: identity.clientName,
    oidcIssuer: identity.oidcIssuer,
    redirectUrl: iriBase,
    tokenType: "DPoP",
    handleRedirect: (url) => {
      console.log(`\nPlease visit ${url} in a web browser.\n`);
    },
  });
});
