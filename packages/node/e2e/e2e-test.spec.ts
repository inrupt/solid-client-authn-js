/*
 * Copyright 2022 Inrupt Inc.
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

import { it, describe, beforeEach, afterEach } from "@jest/globals";
import { custom } from "openid-client";
// eslint-disable-next-line import/no-relative-packages
import { getTestingEnvironment } from "../../../e2e/setup/e2e-setup";
import { Session } from "../src/Session";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

const ENV = getTestingEnvironment();

describe(`End-to-end authentication tests for environment [${ENV.environment}}]`, () => {
  const authenticatedSession = new Session();

  beforeEach(async () => {
    await authenticatedSession.login({
      clientId: ENV.clientId,
      clientSecret: ENV.clientSecret,
      oidcIssuer: ENV.idp,
    });
  });

  afterEach(async () => {
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await authenticatedSession.logout();
  });

  describe("Authenticated fetch", () => {
    it("properly sets up session information", async () => {
      expect(authenticatedSession.info.isLoggedIn).toBe(true);
      expect(authenticatedSession.info.sessionId).toBeDefined();
      expect(authenticatedSession.info.webId).toBeDefined();
    });

    it("can fetch a public resource when logged in", async () => {
      // FIXME: the WebID isn't necessarily a Solid resource.
      const publicResourceUrl = authenticatedSession.info.webId as string;
      const response = await authenticatedSession.fetch(publicResourceUrl, {
        headers: {
          Accept: "text/turtle",
        },
      });
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain(
        ":PersonalProfileDocument"
      );
    });

    it("can fetch a private resource when logged in", async () => {
      const privateResourceUrl = ENV.pod;
      const response = await authenticatedSession.fetch(privateResourceUrl, {
        headers: {
          Accept: "text/turtle",
        },
      });
      expect(response.status).toBe(200);
      // The root should contain at least one child
      await expect(response.text()).resolves.toContain("contains");
      await authenticatedSession.logout();
    });

    it("can fetch a private resource when logged in after the same fetch failed", async () => {
      const unauthSession = new Session();
      const privateResourceUrl = ENV.pod;
      let response = await unauthSession.fetch(privateResourceUrl);
      expect(response.status).toBe(401);

      await unauthSession.login({
        clientId: ENV.clientId,
        clientSecret: ENV.clientSecret,
        oidcIssuer: ENV.idp,
      });

      response = await unauthSession.fetch(privateResourceUrl);
      expect(response.status).toBe(200);

      await unauthSession.logout();
    });
  });

  describe("Unauthenticated fetch", () => {
    it("can fetch a public resource when not logged in", async () => {
      // FIXME: This is only required to get a WebID. Once test setup is automated,
      // this should be deleted.
      const publicResourceUrl = authenticatedSession.info.webId as string;

      const unauthenticatedSession = new Session();
      const response = await unauthenticatedSession.fetch(publicResourceUrl, {
        headers: {
          Accept: "text/turtle",
        },
      });
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain(
        ":PersonalProfileDocument"
      );
    });

    it("cannot fetch a private resource when not logged in", async () => {
      const unauthenticatedSession = new Session();
      const privateResourceUrl = ENV.pod;
      const response = await unauthenticatedSession.fetch(privateResourceUrl);
      expect(response.status).toBe(401);
    });
  });

  describe("Post-logout fetch", () => {
    it("can fetch a public resource after logging out", async () => {
      // FIXME: the WebID isn't necessarily a Solid resource.
      const publicResourceUrl = authenticatedSession.info.webId as string;
      await authenticatedSession.logout();
      const response = await authenticatedSession.fetch(publicResourceUrl, {
        headers: {
          Accept: "text/turtle",
        },
      });
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain(
        ":PersonalProfileDocument"
      );
    });

    it("cannot fetch a private resource after logging out", async () => {
      await authenticatedSession.logout();
      const privateResourceUrl = ENV.pod;
      const response = await authenticatedSession.fetch(privateResourceUrl);
      expect(response.status).toBe(401);
    });
  });
});
