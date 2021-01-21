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

// We only need the following imports from the Node AuthN library.
import {
  getSessionFromStorage,
  Session,
  getSessionIdFromStorageAll,
} from "../../../dist/Session";

import cookieSession from "cookie-session";

const clientApplicationName = "solid-client-authn-node multi session demo";

import express from "express";
const app = express();
const PORT = 3001;

const DEFAULT_OIDC_ISSUER = "https://broker.pod.inrupt.com/";
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
