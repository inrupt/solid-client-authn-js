import {
  Session,
  getSessionFromStorage,
  getSessionIdFromStorageAll,
} from "@inrupt/solid-client-authn-node";

import cookieSession from "cookie-session";

const clientApplicationName = "solid-client-authn-node multi session demo";

import express from "express";
const app = express();
const PORT = 3001;

const DEFAULT_OIDC_ISSUER = "https://login.inrupt.com/";
// This is the endpoint our NodeJS demo app listens on to receive incoming login
const REDIRECT_URL = "http://localhost:3001/redirect";

app.use(
  cookieSession({
    name: "session",
    // These keys are required by cookie-session to sign the cookies.
    keys: [
      "Required, but value not relevant for this demo - key1",
      "Required, but value not relevant for this demo - key2",
    ],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

app.get("/", async (req, res, next) => {
  const sessionIds = await getSessionIdFromStorageAll();
  const sessions = await Promise.all(
    sessionIds.map(async (sessionId) => {
      return await getSessionFromStorage(sessionId);
    })
  );
  const htmlSessions =
    sessions.reduce((sessionList, session) => {
      if (session?.info.isLoggedIn) {
        return sessionList + `<li><strong>${session?.info.webId}</strong></li>`;
      }
      return sessionList + "<li>Logging in process</li>";
    }, "<ul>") + "</ul>";
  res.send(
    `<p>There are currently [${sessionIds.length}] visitors: ${htmlSessions}</p>`
  );
});

app.get("/login", async (req, res, next) => {
  const session = new Session();
  req.session!.sessionId = session.info.sessionId;
  await session.login({
    redirectUrl: REDIRECT_URL,
    oidcIssuer: DEFAULT_OIDC_ISSUER,
    clientName: clientApplicationName,
    handleRedirect: (redirectUrl) => res.redirect(redirectUrl),
  });
  if (session.info.isLoggedIn) {
    res.send(
      `<p>Already logged in with WebID: <strong>[${session.info.webId}]</strong></p>`
    );
  }
});

app.get("/redirect", async (req, res) => {
  const session = await getSessionFromStorage(req.session!.sessionId);
  if (session === undefined) {
    res
      .status(400)
      .send(`<p>No session stored for ID [${req.session!.sessionId}]</p>`);
  } else {
    await session.handleIncomingRedirect(getRequestFullUrl(req));
    if (session.info.isLoggedIn) {
      res.send(
        `<p>Logged in as [<strong>${session.info.webId}</strong>] after redirect</p>`
      );
    } else {
      res.status(400).send(`<p>Not logged in after redirect</p>`);
    }
  }
  res.end();
});

app.get("/fetch", async (req, res, next) => {
  const session = await getSessionFromStorage(req.session!.sessionId);
  if (!req.query["resource"]) {
    res
      .status(400)
      .send(
        "<p>Expected a 'resource' query param, for example <strong>http://localhost:3001/fetch?resource=https://pod.inrupt.com/MY_USERNAME/</strong> to fetch the resource at the root of your Pod (which, by default, only <strong>you</strong> will have access to).</p>"
      );
  } else {
    const fetch = (session ?? new Session()).fetch;
    res.send(
      "<pre>" +
        (await (await fetch(req.query["resource"] as string)).text()).replace(
          /</g,
          "&lt;"
        ) +
        "</pre>"
    );
  }
});

app.get("/logout", async (req, res, next) => {
  const session = await getSessionFromStorage(req.session!.sessionId);
  if (session) {
    const webId = session.info.webId;
    session.logout();
    res.send(`<p>Logged out of session with WebID [${webId}]</p>`);
  } else {
    res.status(400).send(`<p>No active session to log out</p>`);
  }
});

app.listen(PORT, async () => {
  console.log(`Listening on [${PORT}]...`);
});

function getRequestFullUrl(request: express.Request) {
  return request.protocol + "://" + request.get("host") + request.originalUrl;
}
