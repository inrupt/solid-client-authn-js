import { uniqueLogin, handleRedirect } from "solid-auth-fetcher";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import fetch from "node-fetch";
import ISolidSession from "solid-auth-fetcher/dist/ISolidSession";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

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
  if (req.session && req.session.user) {
    res.status(400).send("already logged in");
  }
  const webId: string = req.body.webid;
  const redirect: string = await uniqueLogin({
    oidcIssuer: webId,
    redirect: `${BASE_URL}/redirect`
  });
  res.redirect(redirect);
});

app.get("/redirect", async (req: Request, res: Response) => {
  const session = await handleRedirect(req.url);
  if (req.session) {
    req.session.user = session;
    console.log("before");
    console.log(req.session.user);
  }
  res.redirect("/dashboard");
});

app.get("/dashboard", (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    console.log(req.session.user);
    res.render("dashboard", { webId: req.session.user.webId, fetchResult: "" });
  } else {
    res.status(401).send("You are not logged in");
  }
});

app.post("/fetch", async (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    console.log(req.session.user);
    const result = await (req.session.user as ISolidSession).fetch(
      "http://localhost:9001/storage",
      {}
    );
    res.render("dashboard", {
      webId: req.session.user.webId,
      fetchResult: result.body
    });
  } else {
    res.status(401).send("You are not logged in");
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
