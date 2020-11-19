/*
 * Copyright 2020 Inrupt Inc.
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

const fs = require("fs");
const path = require("path");
const { Session } = require("../../../dist/Session");

const clientApplicationName = "S-C-A Node Demo Client App";

const express = require("express");
const app = express();
const PORT = 3001;

// The HTML we return on all requests (that contains template placeholders that
// we replace as appropriate).
const indexHtml = "./src/index.html";

const markerOidcIssuer = "{{oidcIssuer}}";
const oidcIssuer = "https://broker.demo-ess.inrupt.com/";

const markerStatus = "{{labelStatus}}";

// Initialised when the server comes up and is running...
let session;

app.get("/", (req, res) => {
  res
    .writeHead(200, { "Content-Type": "text/html" })
    .write(statusIndexHtml(""));
  res.end();
});

app.get("/Session.js", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../dist/Session.js"));
});

app.get("/redirect", (req, res) => {
  // The page was loaded after a redirect from the IdP.
  document.getElementById("WebId").innerHTML = session.info.webId;
});

app.get("/login", async (req, res, next) => {
  const oidcIssuer = req.query.oidcIssuer;

  if (!session.info.isLoggedIn) {
    if (oidcIssuer) {
      try {

        const x = await session.login({
          redirectUrl: "http://localhost:3001/redirect",
          oidcIssuer,
          clientName: clientApplicationName,
        });

        console.log(`Node login returned: [${x}]`);
        res.writeHead(302, {
          Location: 'your/404/path.html'
        });
        res.end();
      } catch (error) {
        res
          .writeHead(200, { "Content-Type": "text/html" })
          .write(statusIndexHtml(`Login attempt failed: ${error}`));
        res.end();
      }
    } else {
      next(new Error("No OIDC issuer provided to login API (expected 'oidcIssuer' query parameter)!"));
    }
  } else {
  }
});

app.get("/fetch", (req, res) => {});

app.listen(PORT, async () => {
  session = new Session();

  console.log(
    `[${clientApplicationName}] successfully initialized - listening at: [http://localhost:${PORT}]`
  );
});

function getRequestFullUrl(request) {
  return request.protocol + "://" + request.get("host") + request.originalUrl;
}

function getRequestQueryParam(request, param) {
  return request.protocol + "://" + request.get("host") + request.originalUrl;
}

function updateIndexHtml(search, replace) {
  const data = fs.readFileSync(indexHtml, "utf8");
  return search ? data.split(search).join(replace) : data;
}

function statusIndexHtml(status) {
  return updateIndexHtml(markerOidcIssuer, oidcIssuer).split(markerStatus).join(status);
}
