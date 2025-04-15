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
import log from "loglevel";
import cookieSession from "cookie-session";
import express from "express";
import type {
  ISessionOptions,
  SessionTokenSet,
} from "@inrupt/solid-client-authn-node";
import {
  Session,
  getSessionFromStorage,
  EVENTS,
} from "@inrupt/solid-client-authn-node";
// Extensions are required for JSON-LD imports.
// eslint-disable-next-line import/extensions
import CONSTANTS from "../../../playwright.client-authn.constants.json";

log.setLevel("TRACE");

export function createApp(
  onStart: (value: PromiseLike<void> | void) => void,
  sessionOptions: Partial<ISessionOptions> = {},
) {
  const app = express();

  const sessionTokenSets = new Map<string, SessionTokenSet>();

  app.use(
    cookieSession({
      name: "session",
      // These keys are required by cookie-session to sign the cookies.
      keys: [
        "Required, but value not relevant for this demo - key1",
        "Required, but value not relevant for this demo - key2",
      ],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }),
  );

  app.get("/", (_req, res) => {
    res.status(200).end();
  });

  app.get("/login", async (req, res) => {
    const { oidcIssuer, clientId } = req.query;

    if (typeof oidcIssuer !== "string") {
      res.status(400).send("oidcIssuer is required").end();
      return;
    }

    const session = new Session(sessionOptions);

    req.session!.sessionId = session.info.sessionId;
    await session.login({
      redirectUrl: `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/redirect`,
      oidcIssuer,
      clientId: typeof clientId === "string" ? clientId : undefined,
      handleRedirect: (url) => res.redirect(url),
    });
  });

  app.get("/redirect", async (req, res) => {
    const session = await getSessionFromStorage(req.session!.sessionId);
    if (!session) return;

    session.events.on(EVENTS.NEW_TOKENS, (tokenSet) => {
      sessionTokenSets.set(session.info.sessionId, tokenSet);
    });

    const info = await session.handleIncomingRedirect(
      `${req.protocol}://${req.get("host")}${req.originalUrl}`,
    );

    if (info?.isLoggedIn) {
      res.redirect("/");
      return;
    }

    res.status(400).send("could not log in").end();
  });

  app.get("/fetch", async (req, res) => {
    const { resource } = req.query;

    if (typeof resource !== "string") {
      res.status(400).send("resource must be provided as a string").end();
      return;
    }

    const session = await getSessionFromStorage(req.session!.sessionId);

    const { fetch } = session ?? new Session();
    const response = await fetch(resource);
    res
      .status(response.status)
      .send(await response.text())
      .end();
  });

  app.get("/fetchSessionFromTokens", async (req, res) => {
    const { resource } = req.query;

    if (typeof resource !== "string") {
      res.status(400).send("resource must be provided as a string").end();
      return;
    }

    let session;
    const sessionTokenSet = sessionTokenSets.get(req.session!.sessionId);
    if (sessionTokenSet) {
      session = await Session.fromTokens(
        sessionTokenSet,
        req.session!.sessionId,
      );
    }

    const { fetch } = session ?? new Session();

    const response = await fetch(resource);
    res
      .status(response.status)
      .send(await response.text())
      .end();
  });

  app.get("/tokens", async (req, res) => {
    const tokenSet = sessionTokenSets.get(req.session!.sessionId);
    res.json(tokenSet);
  });

  app.get("/logout", async (req, res) => {
    const session = await getSessionFromStorage(req.session!.sessionId);
    if (!session) return;

    try {
      await session.logout();
      sessionTokenSets.delete(req.session!.sessionId);
      res.status(200).send("successful logout").end();
    } catch (error) {
      res.status(400).send(`Logout processing failed: [${error}]`).end();
    }
  });

  app.get("/postLogoutUrl", async (_req, res) => {
    res.status(200).send("successfully at post logout").end();
  });

  app.get("/idplogout", async (req, res) => {
    const session = await getSessionFromStorage(req.session!.sessionId);
    if (!session) return;

    try {
      await session.logout({
        logoutType: "idp",
        postLogoutUrl: `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`,
        handleRedirect: (url) => {
          res.redirect(url);
        },
      });
      sessionTokenSets.delete(req.session!.sessionId);
    } catch (error) {
      res.status(400).send(`Logout processing failed: [${error}]`).end();
    }
  });

  return app.listen(CONSTANTS.CLIENT_AUTHN_TEST_PORT, async () => {
    onStart();
  });
}
