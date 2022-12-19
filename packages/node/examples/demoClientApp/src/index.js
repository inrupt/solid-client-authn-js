const fs = require("fs");
const log = require("loglevel");

log.setLevel("TRACE");

// The only import we need from the Node AuthN library is the Session class.
const { Session } = require("@inrupt/solid-client-authn-node");

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
const markerResourceToRead = "{{resourceToRead}}";
const markerResourceValueRetrieved = "{{resourceValueRetrieved}}";

const oidcIssuer = "https://login.inrupt.com/";

const enterResourceUriMessage =
  "...but enter any resource URI to attempt to read it...";

// We expect these values to be overwritten as the users interacts!
let loggedOutStatus = "";
let resourceToRead = enterResourceUriMessage;
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

  if (session.info.isLoggedIn) {
    loginStatus = `Already logged in with WebID [${session.info.webId}].`;
    log.info(loginStatus);
    sendHtmlResponse(res);
  } else {
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

        loginStatus = `Login called, expecting redirect function to redirect the user's browser now...`;
        log.info(loginStatus);
      } catch (error) {
        loginStatus = `Login attempt failed: [${error}]`;
        log.error(loginStatus);
        sendHtmlResponse(res);
      }
    } else {
      next(
        new Error(
          "No OIDC issuer provided to login API (expected 'oidcIssuer' query parameter)!"
        )
      );
    }
  }
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
          // This is deliberately making a big assumption about the structure of
          // the logged-in WebID, but if the WebID does have a different
          // structure, which is perfectly valid of course, then this code
          // shouldn't alter it, and the user is free to enter whatever resource
          // URI they actually want anyway, so it's just a convenience in the
          // 'common' case.
          resourceToRead = info.webId.replace("/profile/card#me", "/private/");

          loginStatus = `Successfully logged in with WebID: [${info.webId}].`;
          resourceValueRetrieved = `...logged in successfully - now fetch a resource.`;
          sendHtmlResponse(res);
        } else {
          loginStatus = `Got redirect, but not logged in.`;
          sendHtmlResponse(res);
        }
      });
  } catch (error) {
    log.error(`Error processing redirect: [${error}]`);

    loginStatus = `Redirected, but failed to handle this as an OAuth2 redirect: [${error}]`;
    sendHtmlResponse(res);
  }
});

app.get("/fetch", async (req, res) => {
  const resourceToFetch = req.query.resource;

  // Only attempt to fetch if the resource is not our message to enter a URI!
  if (resourceToFetch === enterResourceUriMessage) {
    resourceValueRetrieved =
      "Please enter a resource URI in the edit box above!";
  } else {
    // Update our state with whatever was in the query param.
    resourceToRead = resourceToFetch;

    try {
      // Validate our input as a URL first.
      new URL(resourceToFetch);

      try {
        const response = await session.fetch(resourceToFetch);

        resourceValueRetrieved = await response.text();
        log.info(`Fetch response: [${resourceValueRetrieved}]`);
      } catch (error) {
        resourceValueRetrieved = `Failed to fetch from resource [${resourceToFetch}]: ${error}`;
        log.error(resourceValueRetrieved);
      }
    } catch (error) {
      resourceValueRetrieved = `Resource to fetch must be a valid URL - got an error parsing [${resourceToFetch}]: ${error}`;
      log.error(resourceValueRetrieved);
    }
  }

  sendHtmlResponse(res);
});

app.get("/logout", async (_req, res, next) => {
  try {
    await session.logout();
    resourceToRead = enterResourceUriMessage;
    resourceValueRetrieved =
      "...nothing read yet - click 'Read Pod Resource' button above...";

    loginStatus = `Logged out successfully.`;
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

    .split(markerResourceToRead)
    .join(resourceToRead)

    .split(markerResourceValueRetrieved)
    .join(resourceValueRetrieved);
}
