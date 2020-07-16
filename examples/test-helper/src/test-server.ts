/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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

/**
 * A server against which acceptance tests may be run
 */
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import { JWT } from "jose";
import keystore from "./keystore";
import getOpenIdConfig from "./openIdConfig";
import path from "path";
import URL from "url-parse";

const PORT = "9001";
const ISSUER = "http://localhost:9001";
interface IUser {
  webID: string;
  username: string;
  password: string;
}
const USERS: IUser[] = [
  {
    webID: `${ISSUER}/ids/jackson`,
    username: "jackson",
    password: "ItsCoolGuy&MrFunkWhyCoolGuyWhy"
  }
];

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(
  session({
    secret: "its_cool_guy"
  })
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.get("/", (req, res) => {
  res.send("Test Server");
});

app.get("/.well-known/openid-configuration", (req, res) => {
  res.send(getOpenIdConfig({ issuer: ISSUER }));
});

app.get("/jwks", (req, res) => {
  res.send(keystore);
});

app.get("/authorize", (req, res) => {
  if (req.session) {
    req.session.authData = req.query;
  }

  res.redirect(`${ISSUER}/login`);
});

app.get("/login", (req, res) => {
  res.render("login", {
    location: `${ISSUER}/login`,
    username: USERS[0].username,
    password: USERS[0].password
  });
});

app.post("/login", (req, res) => {
  const user: IUser | undefined = USERS.find(user => {
    return (
      user.username === req.body.username && user.password === req.body.password
    );
  });
  if (user && req.session) {
    const dpopToken = JWT.decode(req.session.authData.dpop, {
      complete: true
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwk = (dpopToken.header as Record<string, any>).jwk;

    const token: string = JWT.sign(
      {
        cnf: {
          jwk
        }
      },
      keystore.keys[0],
      {
        header: {
          typ: "JWT"
        },
        algorithm: "RS256",
        subject: user.webID,
        issuer: ISSUER,
        expiresIn: "1 hour"
      }
    );
    const redirectUrl = new URL(req.session.authData.redirect_url);
    redirectUrl.set("query", {
      /* eslint-disable @typescript-eslint/camelcase */
      access_token: token,
      id_token: token
      /* eslint-enable @typescript-eslint/camelcase */
    });

    res.redirect(redirectUrl.toString());
  } else {
    res.status(403);
    res.send("Wrong username or password");
  }
});

app.get("/storage", (req, res) => {
  // TODO: inspect token
  res.send("Success");
});

app.listen(PORT, () => console.log(`Test Server listening on port ${PORT}`));
