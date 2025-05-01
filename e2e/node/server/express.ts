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
  refreshTokens,
  logout,
} from "@inrupt/solid-client-authn-node";
// Extensions are required for JSON-LD imports.
// eslint-disable-next-line import/extensions
import CONSTANTS from "../../../playwright.client-authn.constants.json";

export function createApp(
  onStart: (value: PromiseLike<void> | void) => void,
  sessionOptions: Partial<ISessionOptions> = {},
) {
  const app = express();

  const sessionTokenSets = new Map<string, SessionTokenSet>();
  const authStates = new Map<string, { codeVerifier: string; state: string }>();

  app.use(
    cookieSession({
      keys: [`${Math.random()}`],
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
    session.events.on(EVENTS.AUTH_STATE, (authState) => {
      authStates.set(session.info.sessionId, authState);
    });

    req.session!.sessionId = session.info.sessionId;
    await session.login({
      redirectUrl: `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/redirect`,
      oidcIssuer,
      clientId: typeof clientId === "string" ? clientId : undefined,
      handleRedirect: (url) => res.redirect(url),
    });
  });

  app.get("/legacy/login", async (req, res) => {
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
    let session;
    const authState = authStates.get(req.session!.sessionId);
    if (authState) {
      // Create session from saved auth state (for cluster support)
      session = await Session.fromAuthState(authState, req.session!.sessionId);
    } else {
      // Fallback to creating session from in-memory storage
      session = await getSessionFromStorage(req.session!.sessionId);
    }

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

  app.get("/legacy/fetch", async (req, res) => {
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

  app.get("/tokens/fetch", async (req, res) => {
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

  app.get("/tokens/refresh", async (req, res) => {
    const previousTokens = sessionTokenSets.get(req.session!.sessionId);
    if (previousTokens === undefined) {
      res.status(401).send("No session found");
      return;
    }
    const refreshedTokens = await refreshTokens(previousTokens);
    sessionTokenSets.set(req.session!.sessionId, refreshedTokens);
    res.json(refreshedTokens);
  });

  app.get("/legacy/logout/app", async (req, res) => {
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

  app.get("/legacy/logout/idp", async (req, res) => {
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

  app.get("/tokens/logout", async (req, res) => {
    const tokenSet = sessionTokenSets.get(req.session!.sessionId);
    if (!tokenSet) {
      res.status(401).send("No session tokens found").end();
      return;
    }

    try {
      await logout(
        tokenSet,
        (url) => {
          res.redirect(url);
        },
        `http://localhost:${CONSTANTS.CLIENT_AUTHN_TEST_PORT}/postLogoutUrl`,
      );
      // Remove tokens after logout
      sessionTokenSets.delete(req.session!.sessionId);
    } catch (error) {
      res.status(400).send(`Token-based logout failed: [${error}]`).end();
    }
  });

  return app.listen(CONSTANTS.CLIENT_AUTHN_TEST_PORT, async () => {
    onStart();
  });
}
