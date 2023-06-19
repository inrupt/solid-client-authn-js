//
// Copyright 2022 Inrupt Inc.
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

import { jest, it, describe, beforeAll, afterAll, expect } from "@jest/globals";
import { custom } from "openid-client";
import {
  getNodeTestingEnvironment,
  getPodRoot,
} from "@inrupt/internal-test-env";
// Here we want to test how the local code behaves, not the already published one.
// eslint-disable-next-line import/no-relative-packages
import { Session, EVENTS } from "../../packages/node/src/index";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const ENV = getNodeTestingEnvironment();
const credentials = {
  clientId: ENV.clientCredentials.owner.id,
  clientSecret: ENV.clientCredentials.owner.secret,
  oidcIssuer: ENV.idp,
};

describe(`End-to-end authentication tests for environment [${ENV.environment}}]`, () => {
  const authenticatedSession = new Session();

  // Log back in on session expiration
  authenticatedSession.events.on("sessionExpired", () =>
    authenticatedSession.login(credentials)
  );
  beforeAll(() => authenticatedSession.login(credentials));

  // Making sure the session is logged out prevents tests from hanging due
  // to the callback refreshing the access token.
  afterAll(() => authenticatedSession.logout());

  describe("Authenticated fetch", () => {
    it("properly sets up session information", async () => {
      expect(authenticatedSession.info.isLoggedIn).toBe(true);
      expect(authenticatedSession.info.sessionId).toBeDefined();
      expect(authenticatedSession.info.webId).toBeDefined();
      expect(authenticatedSession.info.expirationDate).toBeGreaterThan(
        Date.now()
      );
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
        authenticatedSession.info.webId
      );
    });

    it("can fetch a private resource when logged in", async () => {
      // The following line doesn't compile because of the recursive dependency
      // between the current package, the shared environment setup, and the
      // published version of the current package.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const privateResourceUrl = await getPodRoot(authenticatedSession);
      const response = await authenticatedSession.fetch(privateResourceUrl, {
        headers: {
          Accept: "text/turtle",
        },
      });
      expect(response.status).toBe(200);
      // The root should contain at least one child
      await expect(response.text()).resolves.toContain("contains");
    });

    it("can fetch a private resource when logged in after the same fetch failed", async () => {
      const unauthSession = new Session();
      // The following line doesn't compile because of the recursive dependency
      // between the current package, the shared environment setup, and the
      // published version of the current package.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const privateResourceUrl = await getPodRoot(authenticatedSession);
      let response = await unauthSession.fetch(privateResourceUrl);
      expect(response.status).toBe(401);

      await unauthSession.login(credentials);
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
        authenticatedSession.info.webId
      );
    });

    it("cannot fetch a private resource when not logged in", async () => {
      const unauthenticatedSession = new Session();
      // The following line doesn't compile because of the recursive dependency
      // between the current package, the shared environment setup, and the
      // published version of the current package.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const privateResourceUrl = await getPodRoot(authenticatedSession);
      const response = await unauthenticatedSession.fetch(privateResourceUrl);
      expect(response.status).toBe(401);
    });
  });

  describe("Post-logout fetch", () => {
    beforeAll(async () => authenticatedSession.logout());

    it("can fetch a public resource after logging out", async () => {
      // FIXME: the WebID isn't necessarily a Solid resource.
      const publicResourceUrl = authenticatedSession.info.webId as string;
      const response = await authenticatedSession.fetch(publicResourceUrl, {
        headers: {
          Accept: "text/turtle",
        },
      });
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain(
        authenticatedSession.info.webId
      );
    });

    it("cannot fetch a private resource after logging out", async () => {
      // The following line doesn't compile because of the recursive dependency
      // between the current package, the shared environment setup, and the
      // published version of the current package.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const privateResourceUrl = await getPodRoot(authenticatedSession);
      const response = await authenticatedSession.fetch(privateResourceUrl);
      expect(response.status).toBe(401);
    });
  });
});

describe("Session events", () => {
  let session: Session;
  let loginFunc: () => void;
  let logoutFunc: () => void;
  let expiredFunc: () => void;

  beforeEach(async () => {
    session = new Session();
    loginFunc = jest.fn();
    logoutFunc = jest.fn();
    expiredFunc = jest.fn();
    session.events.on(EVENTS.LOGIN, loginFunc);
    session.events.on(EVENTS.LOGOUT, logoutFunc);
    session.events.on(EVENTS.SESSION_EXPIRED, expiredFunc);

    await session.login(credentials);
  });

  // These tests will check for session expiration, so they'll need a longer timeout.
  jest.setTimeout(15 * 60 * 1000);

  it("sends an event on successful login and logout", async () => {
    expect(session.info.isLoggedIn).toBe(true);
    await session.logout();

    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(1);
    expect(expiredFunc).toHaveBeenCalledTimes(0);
  });

  it("sends an event on session expiration", async () => {
    if (typeof session.info.expirationDate !== "number") {
      throw new Error("Cannot determine session expiration date");
    }
    const expiresIn = session.info.expirationDate - Date.now();
    await new Promise((resolve) => {
      setTimeout(resolve, expiresIn);
    });

    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(0);
    expect(expiredFunc).toHaveBeenCalledTimes(1);
    await session.logout();
    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(1);
    expect(expiredFunc).toHaveBeenCalledTimes(1);
  });
});
