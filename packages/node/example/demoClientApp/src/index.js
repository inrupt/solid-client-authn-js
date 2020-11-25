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

const fs = require("fs");
const log = require("loglevel");

log.setLevel("TRACE");

// The only import we need from the Node AuthN library is the Session class.
const { Session } = require("../../../dist/Session");

const clientApplicationName = "S-C-A Node Demo Client App";

const express = require("express");
const app = express();
const PORT = 3001;

// The HTML we return on all requests (that contains template placeholders that
// we replace as appropriate).
const indexHtml = "./src/index.html";

const markerOidcIssuer = "{{oidcIssuer}}";
const markerLoginStatus = "{{labelLoginStatus}}";
const markerLogoutStatus = "{{labelLogoutStatus}}";
const markerWebIdToRead = "{{webIdToRead}}";
const markerResourceValueRetrieved = "{{resourceValueRetrieved}}";

const oidcIssuer = "https://broker.demo-ess.inrupt.com/";

// We expect these values to be overwritten as the users interacts!
let loggedOutStatus = "";
let webIdToRead =
  "...not logged in yet - but enter any WebID to read from its profile...";
let resourceValueRetrieved = "...not read yet...";
let loginStatus = "Not logged in yet.";

// Initialised when the server comes up and is running...
let session;

app.get("/", (_req, res) => {
  loginStatus = session.info.isLoggedIn
    ? `Logged in as [${session.info.webId}]`
    : `Not logged in`;

  sendHtmlResponse(res);
});

app.get("/login", async (req, res, next) => {
  const oidcIssuer = req.query.oidcIssuer;

  if (!session.info.isLoggedIn) {
    if (oidcIssuer) {
      try {
        await session.login({
          redirectUrl: "http://localhost:3001/redirect",
          oidcIssuer,
          clientName: clientApplicationName,
          handleRedirect: (data) => {
            res.writeHead(302, {
              location: data,
            });
            res.end();
          },
        });

        log.info(
          `SCA Node 'login()' called, expect redirect function to redirect the user's browser now...`
        );
      } catch (error) {
        log.error(`SCA Node 'login()' failed: [${error}]`);
        loginStatus = `Login attempt failed: [${error}]`;
        sendHtmlResponse();
      }
    } else {
      next(
        new Error(
          "No OIDC issuer provided to login API (expected 'oidcIssuer' query parameter)!"
        )
      );
    }
  }
  log.info("Already logged in.");
  sendHtmlResponse();
});

app.get("/redirect", async (req, res) => {
  try {
    log.debug(`Got redirect: [${getRequestFullUrl(req)}]`);
    await session
      .handleIncomingRedirect(getRequestFullUrl(req))
      .then((info) => {
        log.info(`Got INFO: [${JSON.stringify(info, null, 2)}]`);
        if (info === undefined) {
          loginStatus = `Received another redirect, but we are already handling a previous redirect request - so ignoring this one!`;
          sendHtmlResponse(res);
        } else if (info.isLoggedIn) {
          webIdToRead = info.webId;
          loginStatus = `Successfully logged in with WebID: [${info.webId}].`;
          sendHtmlResponse(res);
        } else {
          loginStatus = `Got redirect, but not logged in.`;
          sendHtmlResponse(res);
        }
      });
  } catch (error) {
    log.error(`Error processing redirect: [${error}]`);

    // TODO: PMcB55: Remove this when Login works! Just hard-coding this to test
    //  rendering valid response.
    webIdToRead = "https://pmcb55x.solidcommunity.net/profile/card#me";

    loginStatus = `Redirected, but failed to handle this as an OAuth2 redirect: [${error}]`;
    sendHtmlResponse(res);
  }
});

app.get("/fetch", async (req, res) => {
  const resourceToFetch = req.query.resource;
  // Update our state with whatever was in the query param.
  webIdToRead = resourceToFetch;

  try {
    // Validate our input as a URL first.
    new URL(resourceToFetch);

    try {
      const response = await session.fetch(resourceToFetch, {
        method: "GET",
        // headers: {
        //   'Content-Type': 'text/turtle'
        // }
      });

      resourceValueRetrieved = await response.text();
    } catch (error) {
      resourceValueRetrieved = `Failed to fetch from resource [${resourceToFetch}]: ${error}`;
    }
  } catch (error) {
    resourceValueRetrieved = `Resource to fetch must be a valid URL - got an error parsing [${resourceToFetch}]: ${error}`;
  }

  log.info(`Fetch response: [${resourceValueRetrieved}]`);
  sendHtmlResponse(res);
});

app.get("/logout", async (_req, res, next) => {
  try {
    await session.logout();
    webIdToRead =
      "...logged out - WebID will be initialized when you log in again...";
    resourceValueRetrieved = "...not read yet...";

    loginStatus = `Logged out.`;
    sendHtmlResponse(res);
  } catch (error) {
    log.error(`Logout processing failed: [${error}]`);
    loginStatus = `Logout processing failed: [${error}]`;
    sendHtmlResponse(res);
  }
});

app.listen(PORT, async () => {
  session = new Session();

  log.info(
    `[${clientApplicationName}] successfully initialized - listening at: [http://localhost:${PORT}]`
  );
});

function sendHtmlResponse(response) {
  response
    .writeHead(200, { "Content-Type": "text/html" })
    .write(statusIndexHtml());
  response.end();
}

function getRequestFullUrl(request) {
  return request.protocol + "://" + request.get("host") + request.originalUrl;
}

function getRequestQueryParam(request, param) {
  return request.protocol + "://" + request.get("host") + request.originalUrl;
}

function statusIndexHtml() {
  return fs
    .readFileSync(indexHtml, "utf8")
    .split(markerOidcIssuer)
    .join(oidcIssuer)

    .split(markerLoginStatus)
    .join(loginStatus)

    .split(markerLogoutStatus)
    .join(loggedOutStatus)

    .split(markerWebIdToRead)
    .join(webIdToRead)

    .split(markerResourceValueRetrieved)
    .join(resourceValueRetrieved);
}
