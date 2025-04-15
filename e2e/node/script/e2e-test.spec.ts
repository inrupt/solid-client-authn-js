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

import {
  getNodeTestingEnvironment,
  getPodRoot,
} from "@inrupt/internal-test-env";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { custom } from "openid-client";
import { getSolidDataset } from "@inrupt/solid-client";
import { EVENTS, Session } from "@inrupt/solid-client-authn-node";
import type { SessionTokenSet } from "@inrupt/solid-client-authn-node";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const ENV = getNodeTestingEnvironment();
const { owner } = ENV.clientCredentials;

function getCredentials() {
  return {
    clientId: owner.id,
    clientSecret: owner.secret,
    oidcIssuer: ENV.idp,
  };
}

// Testing the Client Credentials authorization flow from a command-line application.

describe(`End-to-end authentication tests for environment [${ENV.environment}}]`, () => {
  const authenticatedSession = new Session();
  let tokens: SessionTokenSet;
  authenticatedSession.events.on("newTokens", (tokenSet) => {
    tokens = tokenSet;
  });

  // Log back in on session expiration
  authenticatedSession.events.on("sessionExpired", () =>
    authenticatedSession.login(getCredentials()),
  );
  beforeAll(() => authenticatedSession.login(getCredentials()));

  // Making sure the session is logged out prevents tests from hanging due
  // to the callback refreshing the access token.
  afterAll(() => authenticatedSession.logout());

  // eslint-disable-next-line jest/expect-expect
  it("test", async () => {
    let headerResolver: (p: Headers) => void;
    const headersPromise: Promise<Headers> = new Promise((resolve) => {
      headerResolver = resolve;
    });
    await getSolidDataset("https://id.inrupt.com/zwifi", {
      fetch: (info, init) =>
        fetch(info, {
          ...init,
          headers: {
            "some-custom-header": "custom-value",
          },
        }).then((response) => {
          headerResolver(response.headers);
          return response;
        }),
    });
    const headers = await headersPromise;
    // eslint-disable-next-line no-console
    console.log(headers.get("Content-Type"));
  });

  describe("Authenticated fetch", () => {
    it("sets the session tokens", async () => {
      expect(tokens.idToken).toBeDefined();
      expect(tokens.clientId).toEqual(getCredentials().clientId);
      // The client credentials flow should not issue a Refresh Token.
      expect(tokens.refreshToken).toBeUndefined();
    });

    it("properly sets up session information", async () => {
      expect(authenticatedSession.info.isLoggedIn).toBe(true);
      expect(authenticatedSession.info.sessionId).toBeDefined();
      expect(authenticatedSession.info.webId).toBeDefined();
      expect(authenticatedSession.info.expirationDate).toBeGreaterThan(
        Date.now(),
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
        authenticatedSession.info.webId,
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

      await unauthSession.login(getCredentials());

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
        authenticatedSession.info.webId,
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
        authenticatedSession.info.webId,
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
  // These tests will check for session expiration, so they'll need a longer timeout.
  jest.setTimeout(15 * 60 * 1000);

  let session: Session;
  let loginFunc: () => void;
  let logoutFunc: () => void;
  let expiredFunc: () => void;
  let newTokensFunc: jest.Mock;

  beforeEach(async () => {
    session = new Session();
    loginFunc = jest.fn();
    logoutFunc = jest.fn();
    expiredFunc = jest.fn();
    newTokensFunc = jest.fn();
    session.events.on(EVENTS.LOGIN, loginFunc);
    session.events.on(EVENTS.LOGOUT, logoutFunc);
    session.events.on(EVENTS.SESSION_EXPIRED, expiredFunc);
    session.events.on(EVENTS.NEW_TOKENS, newTokensFunc);
    await session.login(getCredentials());
  });

  it("sends an event on successful login and logout", async () => {
    expect(session.info.isLoggedIn).toBe(true);
    await session.logout();

    expect(loginFunc).toHaveBeenCalledTimes(1);
    expect(logoutFunc).toHaveBeenCalledTimes(1);
    expect(expiredFunc).toHaveBeenCalledTimes(0);
    expect(newTokensFunc).toHaveBeenCalledTimes(1);
    const tokenArgument: SessionTokenSet = newTokensFunc.mock
      .calls[0][0] as SessionTokenSet;
    expect(tokenArgument.accessToken).toBeDefined();
    expect(tokenArgument.idToken).toBeDefined();
    expect(tokenArgument.webId).toBeDefined();
    expect(tokenArgument.expiresAt).toBeDefined();
    expect(tokenArgument.dpopKey).toBeDefined();
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
