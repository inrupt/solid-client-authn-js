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

import { it, describe } from "@jest/globals";
import { config } from "dotenv-flow";
import { Session } from "../Session";

// Load environment variables from .env.local if available:
config({
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

// This first test just saves the trouble of looking for a library failure when
// the environment wasn't properly set.
describe("Environment", () => {
  it("contains the expected environment variables", () => {
    expect(process.env.E2E_TEST_REFRESH_TOKEN).not.toBeUndefined();
    expect(process.env.E2E_TEST_CLIENT_ID).not.toBeUndefined();
    expect(process.env.E2E_TEST_CLIENT_SECRET).not.toBeUndefined();
    expect(process.env.E2E_TEST_IDP_URL).not.toBeUndefined();
  });
});

describe("Authenticated fetch", () => {
  it("properly sets up session information", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });
    expect(session.info.isLoggedIn).toEqual(true);
    expect(session.info.sessionId).not.toBeUndefined();
    expect(session.info.webId).not.toBeUndefined();
  });

  it("can fetch a public resource when logged in", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });
    const publicResourceUrl = session.info.webId!;
    const response = await session.fetch(publicResourceUrl);
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain(
      "foaf:PersonalProfileDocument"
    );
  });

  it("can fetch a private resource when logged in", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });
    const privateResourceUrl = process.env.E2E_TEST_ESS_POD!;
    const response = await session.fetch(privateResourceUrl);
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain("ldp:BasicContainer");
  });

  it("can fetch a private resource when logged in after the same fetch failed", async () => {
    const session = new Session();
    const privateResourceUrl = process.env.E2E_TEST_ESS_POD!;
    let response = await session.fetch(privateResourceUrl);
    expect(response.status).toEqual(401);

    await session.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });

    response = await session.fetch(privateResourceUrl);
    expect(response.status).toEqual(200);

    await session.logout();
    response = await session.fetch(privateResourceUrl);
    expect(response.status).toEqual(401);
  });

  it("only logs in the requested session", async () => {
    const authenticatedSession = new Session();
    const privateResourceUrl = process.env.E2E_TEST_ESS_POD!;

    await authenticatedSession.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });

    let response = await authenticatedSession.fetch(privateResourceUrl);
    expect(response.status).toEqual(200);

    const nonAuthenticatedSession = new Session();
    response = await nonAuthenticatedSession.fetch(privateResourceUrl);
    expect(response.status).toEqual(401);
  });
});

describe("Unauthenticated fetch", () => {
  it("can fetch a public resource when not logged in", async () => {
    const authenticatedSession = new Session();
    await authenticatedSession.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });
    const publicResourceUrl = authenticatedSession.info.webId!;

    const unauthenticatedSession = new Session();
    const response = await unauthenticatedSession.fetch(publicResourceUrl);
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain(
      "foaf:PersonalProfileDocument"
    );
  });

  it("cannot fetch a private resource when not logged in", async () => {
    const session = new Session();
    const privateResourceUrl = process.env.E2E_TEST_ESS_POD!;
    const response = await session.fetch(privateResourceUrl);
    expect(response.status).toEqual(401);
  });
});

describe("Post-logout fetch", () => {
  it("can fetch a public resource after logging out", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });
    const publicResourceUrl = session.info.webId!;
    await session.logout();
    const response = await session.fetch(publicResourceUrl);
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain(
      "foaf:PersonalProfileDocument"
    );
  });

  it("cannot fetch a private resource after logging out", async () => {
    const session = new Session();
    const privateResourceUrl = process.env.E2E_TEST_ESS_POD!;
    await session.login({
      clientId: process.env.E2E_TEST_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
      refreshToken: process.env.E2E_TEST_REFRESH_TOKEN,
      oidcIssuer: process.env.E2E_TEST_IDP_URL,
    });
    await session.logout();
    const response = await session.fetch(privateResourceUrl);
    expect(response.status).toEqual(401);
  });
});
