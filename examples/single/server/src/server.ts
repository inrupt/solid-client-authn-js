import { uniqueLogin, handleRedirect } from "solid-client-authn";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import fetch from "node-fetch";
import ISolidSession from "solid-client-authn/dist/solidSession/ISolidSession";
import INeedeRedirectAction from "solid-client-authn/dist/neededAction/INeededRedirectAction";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const sessions: Record<string, ISolidSession> = {};

const app = express();

app.use(
  session({
    secret: "I let Kevin's son beat me in foosball",
    cookie: { secure: false }
  })
);

app.use(bodyParser.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.get("/", (req: Request, res: Response) => {
  res.render("home");
});

app.post("/login", async (req: Request, res: Response) => {
  if (req.session && req.session.localUserId) {
    res.status(400).send("already logged in");
  }
  const webId: string = req.body.webid;
  const session = await uniqueLogin({
    oidcIssuer: webId,
    redirect: `${BASE_URL}/redirect`,
    clientId: "coolApp"
  });
  if (req.session) {
    req.session.localUserId = session.localUserId;
    sessions[session.localUserId] = session;
    if (
      session.neededAction &&
      session.neededAction.actionType === "redirect"
    ) {
      res.redirect((session.neededAction as INeedeRedirectAction).redirectUrl);
    }
  }
});

app.get("/redirect", async (req: Request, res: Response) => {
  const session = await handleRedirect(req.url);
  if (req.session) {
    req.session.localUserId = session.localUserId;
    sessions[session.localUserId] = session;
  }
  res.redirect("/dashboard");
});

app.get("/dashboard", (req: Request, res: Response) => {
  if (
    req.session &&
    req.session.localUserId &&
    sessions[req.session.localUserId] &&
    sessions[req.session.localUserId].webId
  ) {
    res.render("dashboard", {
      webId: sessions[req.session.localUserId].webId,
      fetchResult: ""
    });
  } else {
    res.status(401).send("You are not logged in");
  }
});

app.post("/fetch", async (req: Request, res: Response) => {
  if (
    req.session &&
    req.session.localUserId &&
    sessions[req.session.localUserId] &&
    sessions[req.session.localUserId].webId
  ) {
    const result = await (sessions[
      req.session.localUserId
    ] as ISolidSession).fetch("http://localhost:10100/", {});
    res.render("dashboard", {
      webId: sessions[req.session.localUserId].webId,
      fetchResult: JSON.stringify(await result.text(), null, 2)
    });
  } else {
    res.status(401).send("You are not logged in");
  }
});

app.post("/logout", async (req: Request, res: Response) => {
  if (
    req.session &&
    req.session.localUserId &&
    sessions[req.session.localUserId] &&
    sessions[req.session.localUserId].webId
  ) {
    await sessions[req.session.localUserId].logout();
    delete sessions[req.session.localUserId];
    delete req.session.localUserId;
    res.redirect("/");
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
