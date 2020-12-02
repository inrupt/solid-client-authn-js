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

import { it, describe } from "@jest/globals";
import { Session } from "../Session";

const OIDC_ISSUER = "https://broker.demo-ess.inrupt.com/";

// This first test just saves the trouble of looking for a library failure when
// the environment wasn't properly set.
describe("Environment", () => {
  it("contains the expected environment variables", () => {
    expect(process.env.REFRESH_TOKEN).not.toBeUndefined();
    expect(process.env.CLIENT_ID).not.toBeUndefined();
    expect(process.env.CLIENT_SECRET).not.toBeUndefined();
  });
});

describe("Authenticated fetch", () => {
  it("can fetch a public resource when logged in", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      oidcIssuer: OIDC_ISSUER,
    });
    const response = await session.fetch(
      "https://ldp.demo-ess.inrupt.com/105177326598249077653/profile/card#me"
    );
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain(
      "foaf:PersonalProfileDocument"
    );
  });

  it("can fetch a private resource when logged in", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      oidcIssuer: OIDC_ISSUER,
    });
    const response = await session.fetch(
      "https://ldp.demo-ess.inrupt.com/105177326598249077653/"
    );
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain("ldp:BasicContainer");
  });
});

describe("Unauthenticated fetch", () => {
  it("can fetch a public resource when not logged in", async () => {
    const session = new Session();
    const response = await session.fetch(
      "https://ldp.demo-ess.inrupt.com/105177326598249077653/profile/card#me"
    );
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain(
      "foaf:PersonalProfileDocument"
    );
  });

  it("cannot fetch a private resource when not logged in", async () => {
    const session = new Session();
    const response = await session.fetch(
      "https://ldp.demo-ess.inrupt.com/105177326598249077653/"
    );
    expect(response.status).toEqual(401);
  });
});

describe("Post-logout fetch", () => {
  it("can fetch a public resource after logging out", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      oidcIssuer: OIDC_ISSUER,
    });
    await session.logout();
    const response = await session.fetch(
      "https://ldp.demo-ess.inrupt.com/105177326598249077653/profile/card#me"
    );
    expect(response.status).toEqual(200);
    await expect(response.text()).resolves.toContain(
      "foaf:PersonalProfileDocument"
    );
  });

  it("cannot fetch a private resource after logging out", async () => {
    const session = new Session();
    await session.login({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      oidcIssuer: OIDC_ISSUER,
    });
    await session.logout();
    const response = await session.fetch(
      "https://ldp.demo-ess.inrupt.com/105177326598249077653/"
    );
    expect(response.status).toEqual(401);
  });
});
