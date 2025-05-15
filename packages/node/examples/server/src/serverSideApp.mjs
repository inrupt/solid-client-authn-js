//
// Copyright Inrupt Inc.
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

import {
  Session,
  logout,
  refreshTokens,
  EVENTS
} from "@inrupt/solid-client-authn-node";
import { getPodUrlAll } from "@inrupt/solid-client";
import cookieSession from "cookie-session";
import express from "express";

const app = express();

app.use(cookieSession({
  keys: [`${Math.random()}`]
}));

// For simplicity, the cache is here an in-memory map. In a real application,
// tokens and auth state would be stored in a persistent storage.
const sessionCache = {};
const updateSessionCache = (sessionId, data) => {
  sessionCache[sessionId] = data;
};

app.get("/", async (_, res) => {
  const htmlSessions = `${Object.values(sessionCache)
    .reduce((sessionList, sessionTokens) => (
      `${sessionList}<li><strong>${sessionTokens.webId}</strong></li>`
      ),
      "<ul>")}</ul>`;
  res.send(
    `<p>There are currently [${Object.values(sessionCache).length}] visitors: ${htmlSessions}</p><p><a href="/login">Log in</a>`,
  );
});

app.get("/login", async (req, res) => {
  const session = new Session({ keepAlive: false });
  // Set a cookie with the session ID.
  req.session.sessionId = session.info.sessionId;

  session.events.on(EVENTS.AUTHORIZATION_REQUEST, (authorizationRequestState) => {
    console.log("Auth state captured during login:", session.info.sessionId);
    updateSessionCache(session.info.sessionId, authorizationRequestState);
  });

  await session.login({
    clientId: process.env.CLIENT_ID,
    redirectUrl: process.env.REDIRECT_URL,
    oidcIssuer: process.env.OPENID_PROVIDER,
    handleRedirect: (redirectUrl) => res.redirect(redirectUrl),
  });
  if (session.info.isLoggedIn) {
    res.send(
      `<p>Already logged in with WebID: <strong>[${session.info.webId}]</strong></p>`,
    );
  }
});

app.get("/redirect", async (req, res) => {
  // First check if we have stored auth state for this session
  const authorizationRequestState = sessionCache[req.session.sessionId];
  if (authorizationRequestState === undefined) {
    res
        .status(401)
        .send(`<p>No authorizationRequestState stored for ID [${req.session.sessionId}]</p>`);
    return;
  }

  console.log("Using fromAuthorizationRequestState to restore session:", req.session.sessionId);
  // Create session from stored auth state (supports clustered deployment)
  const session = await Session.fromAuthorizationRequestState(authorizationRequestState, req.session.sessionId);

  if (session === undefined) {
    res
      .status(400)
      .send(`<p>No session stored for ID [${req.session.sessionId}]</p>`);
    return;
  }

  session.events.on(
    EVENTS.NEW_TOKENS,
    (tokenSet) => updateSessionCache(req.session.sessionId, tokenSet)
  );

  await session.handleIncomingRedirect(getRequestFullUrl(req));
  if (session.info.isLoggedIn) {
    const storageUrl = await getPodUrlAll(session.info.webId);
    res.send(
      `<p>Logged in as [<strong>${session.info.webId}</strong>] after redirect.</p>
      <p><a href="/fetch?resource=${storageUrl}">Fetch my Pod root</a></p>`,
    );
  } else {
    res.status(400).send(`<p>Not logged in after redirect</p>`);
  }
  res.end();
});

app.get("/refresh", async (req, res) => {
  const refreshedTokens = await refreshTokens(sessionCache[req.session.sessionId]);
  updateSessionCache(req.session.sessionId, refreshedTokens);
  const session = await Session.fromTokens(refreshedTokens, req.session.sessionId);
  if (session.info.isLoggedIn) {
    const storageUrl = await getPodUrlAll(session.info.webId);
    res.send(
      `<p>Refreshed session for [<strong>${session.info.webId}</strong>].</p>
      <p><a href="/fetch/time?resource=${storageUrl}">Fetch my Pod root (latest)</a></p>`,
    );
    return;
  }
  res.status(400).send(`<p>Could not refresh the session</p>`);
});

app.get("/fetch", async (req, res) => {
  const session = await Session.fromTokens(sessionCache[req.session.sessionId], req.session.sessionId);
  if (!req.query.resource) {
    res
      .status(400)
      .send(
        "<p>Expected a 'resource' query param, for example <strong>http://localhost:3001/fetch?resource=https://pod.inrupt.com/MY_USERNAME/</strong> to fetch the resource at the root of your Pod (which, by default, only <strong>you</strong> will have access to).</p>",
      );
    return;
  }
  res.send(
    `<pre>${(
      await session.fetch(req.query.resource).then(r => r.text())
    ).replace(/</g, "&lt;")}</pre>`,
  );
});

app.get("/logout", async (req, res) => {
  if (sessionCache[req.session.sessionId] === undefined) {
    res.status(400).send(`<p>No active session to log out</p>`);
    return;
  }
  const sessionTokens = sessionCache[req.session.sessionId];
  delete sessionCache[req.session.sessionId];
  await logout(
    sessionTokens,
    (url) => {
      res.redirect(url);
    },
    process.env.POST_LOGOUT_REDIRECT_URL,
  );
});

app.listen(process.env.PORT, async () => {
  console.log(`Listening on http://localhost:${process.env.PORT}...`);
});

function getRequestFullUrl(request) {
  return `${request.protocol}://${request.get("host")}${request.originalUrl}`;
}
