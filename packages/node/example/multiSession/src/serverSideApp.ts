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
import { getStoredSession, Session } from "../../../dist/Session";
import cookieSession from "cookie-session";

const clientApplicationName = "solid-client-authn-node multi session demo";

import express from "express";
import { FileSystemStorage } from "./fileSystemStorage";
const app = express();
const PORT = 3001;
const storage = new FileSystemStorage("sessions-data.json");

const DEFAULT_OIDC_ISSUER = "https://broker.pod.inrupt.com/";

app.use(
  cookieSession({
    name: "session",
    keys: ["let me tell you a secret", "love isn't an actual ingredient"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

app.get("/login", async (req, res, next) => {
  const session = new Session({ storage });
  req.session!.sessionId = session.info.sessionId;
  await session.login({
    redirectUrl: "http://localhost:3001/redirect",
    oidcIssuer: DEFAULT_OIDC_ISSUER,
    clientName: clientApplicationName,
    handleRedirect: (data) => {
      res.writeHead(302, {
        location: data,
      });
      res.end();
    },
  });
  if (session.info.isLoggedIn) {
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .write(`<p>Alredy logged in</p>`);
    res.end();
  }
});

app.get("/redirect", async (req, res) => {
  const session =
    (await getStoredSession(req.session!.sessionId, storage)) ??
    new Session({ storage }, req.session!.sessionId);

  await session.handleIncomingRedirect(getRequestFullUrl(req));
  if (session.info.isLoggedIn) {
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .write(`<p>Logged in as ${session.info.webId} after redirect</p>`);
  } else {
    res
      .writeHead(400, { "Content-Type": "text/html" })
      .write(`<p>Not logged in after redirect</p>`);
  }
  res.end();
});

app.get("/fetch", async (req, res, next) => {
  const session = await getStoredSession(req.session!.sessionId, storage);
  if (!req.query["resource"]) {
    res
      .writeHead(400, { "Content-Type": "text/html" })
      .write("<p>Expected a 'resource' query param</p>");
  } else if (session) {
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .write(
        await (await session.fetch(req.query["resource"] as string)).text()
      );
  } else {
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .write(
        await (
          await new Session().fetch(req.query["resource"] as string)
        ).text()
      );
  }
  res.end();
});

app.get("/logout", async (req, res, next) => {
  const session = await getStoredSession(req.session!.sessionId, storage);
  if (session) {
    session.logout();
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .write(`<p>logged out</p>`);
  } else {
    res
      .writeHead(400, { "Content-Type": "text/html" })
      .write(`<p>No active session to log out</p>`);
  }
  res.end();
});

app.listen(PORT, async () => {
  console.log(`Listening to ${PORT}`);
});

function getRequestFullUrl(request: express.Request) {
  return request.protocol + "://" + request.get("host") + request.originalUrl;
}
