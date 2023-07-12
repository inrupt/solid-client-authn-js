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
import express from "express";
import { Session } from "@inrupt/solid-client-authn-node/src/index";

log.setLevel("TRACE");

export const PORT = 3001;

export function createApp(onStart: () => void) {
  const app = express();

  // Initialised when the server comes up and is running...
  let session: Session;

  app.get("/", async (req, res) => {
    return res.status(200).end();
  });

  app.get("/login", async (req, res) => {
    const { oidcIssuer, clientId } = req.query;

    if (typeof oidcIssuer !== "string") {
      return res.status(400).send("oidcIssuer is required").end();
    }

    return session.login({
      redirectUrl: "http://localhost:3001/redirect",
      oidcIssuer,
      clientId: typeof clientId === "string" ? clientId : undefined,
      handleRedirect: (url) => res.redirect(url),
    });
  });

  app.get("/redirect", async (req, res) => {
    const info = await session.handleIncomingRedirect(
      `${req.protocol}://${req.get("host")}${req.originalUrl}`
    );

    if (info?.isLoggedIn) {
      return res.redirect("/");
    }

    return res.status(400).send("could not log in").end();
  });

  app.get("/fetch", async (req, res) => {
    const { resource } = req.query;

    if (typeof resource !== "string") {
      return res
        .status(400)
        .send("resource must be provided as a string")
        .end();
    }

    const response = await session.fetch(resource);
    return res
      .status(response.status)
      .send(await response.text())
      .end();
  });

  app.get("/logout", async (_req, res) => {
    try {
      await session.logout();
      return res.status(200).send("successful logout").end();
    } catch (error) {
      return res.status(400).send(`Logout processing failed: [${error}]`).end();
    }
  });

  app.get("/postLogoutUrl", async (_req, res) => {
    return res.status(200).send("successfully at post logout").end();
  });

  app.get("/idplogout", async (_req, res) => {
    try {
      return await session.logout({
        logoutType: "idp",
        postLogoutUrl: "http://localhost:3001/postLogoutUrl",
        handleRedirect: (url) => {
          res.redirect(url);
        },
      });
    } catch (error) {
      return res.status(400).send(`Logout processing failed: [${error}]`).end();
    }
  });

  return app.listen(PORT, async () => {
    session = new Session();

    onStart();
  });
}
