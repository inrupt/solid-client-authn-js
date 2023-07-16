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
import { CognitoPage, OpenIdPage } from "@inrupt/internal-playwright-helpers";
import {
  getBrowserTestingEnvironment,
  getNodeTestingEnvironment,
  getPodRoot,
} from "@inrupt/internal-test-env";
import { deleteFile, saveFileInContainer } from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-node";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { firefox } from "@playwright/test";
import express from "express";
import type { Server } from "http";
import { custom } from "openid-client";
import path from "path";
import { v4 } from "uuid";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const ENV = getNodeTestingEnvironment();
const BROWSER_ENV = getBrowserTestingEnvironment();
const TEXT = "SAMPLE DATA TEXT";

describe("RP initiated login/out using playwright", () => {
  let session: Session;
  let clientResourceUrl: string;
  const clientResourceContent = "This is a plain piece of text";
  let server: Server;
  let webId: string;

  beforeAll(async () => {
    const app = express();
    app.use(
      express.static(path.join(__dirname, "..", "test-solid-ui", "build"))
    );
    app.get("/data", (_, res) => {
      return res.send(TEXT).status(200);
    });
    server = app.listen(3000);
    await new Promise((res) => {
      server.on("listening", res);
    });

    if (ENV.clientCredentials.owner.type !== "ESS Client Credentials") {
      throw new Error("Only ESS Client Credentials supported");
    }

    session = new Session();
    await session.login({
      oidcIssuer: ENV.idp,
      clientId: ENV.clientCredentials.owner.id,
      clientSecret: ENV.clientCredentials.owner.secret,
    });

    const root = await getPodRoot(session);
    const name = v4();

    await saveFileInContainer(
      root,
      new File([clientResourceContent], "myFile", { type: "plain/text" }),
      { slug: name, contentType: "text/plain", fetch: session.fetch }
    );

    clientResourceUrl = `${root}/${name}`;

    if (session.info.webId === undefined) {
      throw new Error("Unexpected undefined WebId");
    }

    webId = session.info.webId;
  }, 30_000);

  afterAll(async () => {
    await new Promise((res) => {
      server.close(res);
    });
    await deleteFile(clientResourceUrl, { fetch: session.fetch });
    await session.logout();
  }, 30_000);

  it("Should work with solid-ui-react", async () => {
    const browser = await firefox.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/");

    await page.fill('input[id="resourceInput"]', "http://localhost:3000/data");
    const attribute = await page.waitForSelector('div[id="data"]');
    await expect(attribute.innerText()).resolves.toEqual(TEXT);

    await page.fill('input[id="issuerInput"]', BROWSER_ENV.idp);
    await page.click("button");

    // Wait for navigation outside the localhost session
    await page.waitForURL(/^https/);

    const cognitoPage = new CognitoPage(page);
    await cognitoPage.login(
      BROWSER_ENV.clientCredentials.owner.login,
      BROWSER_ENV.clientCredentials.owner.password
    );
    const openidPage = new OpenIdPage(page);
    try {
      await openidPage.allow();
    } catch (e) {
      // Ignore allow error for now
    }

    const webIdContent = await page.waitForSelector('div[id="webId"]');
    await expect(webIdContent.innerText()).resolves.toEqual(webId);

    await page.fill('input[id="resourceInput"]', clientResourceUrl);
    const authenticatedContent = await page.waitForSelector('div[id="data"]');
    await expect(authenticatedContent.innerText()).resolves.toEqual(
      clientResourceContent
    );

    await browser.close();
  }, 60_000);
});
