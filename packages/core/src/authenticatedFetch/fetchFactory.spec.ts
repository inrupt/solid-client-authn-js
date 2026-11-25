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

// This is necessary to mock fetch
/* eslint-disable no-shadow */
// Camelcase identifiers are aligned with the OAuth specification.
/* eslint-disable camelcase */

import { jest, it, describe, expect, afterEach } from "@jest/globals";
import type { CryptoKey } from "jose";
import { jwtVerify, generateKeyPair, exportJWK } from "jose";
import { EventEmitter } from "events";
import { createHash } from "node:crypto";
import {
  authenticateFetch,
  buildAuthenticatedFetch,
  DEFAULT_EXPIRATION_TIME_SECONDS,
} from "./fetchFactory";
import {
  mockDefaultTokenRefresher,
  mockDefaultTokenSet,
  mockTokenRefresher,
} from "../login/oidc/refresh/__mocks__/TokenRefresher";
import { EVENTS } from "../constant";
import { OidcProviderError } from "../errors/OidcProviderError";
import { InvalidResponseError } from "../errors/InvalidResponseError";
import type {
  ITokenRefresher,
  TokenEndpointResponse,
} from "../login/oidc/refresh/ITokenRefresher";

if (process.env.CI === "true") {
  // We don't want flaky tests to break the CI, and the fact that we are using
  // actual timers instead of mock ones is a known issue that often requires the
  // tests to re-run in CI.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

const mockNotRedirectedResponse = () => {
  const mockedResponse = new Response(undefined);
  jest.spyOn(mockedResponse, "redirected", "get").mockReturnValueOnce(false);
  jest
    .spyOn(mockedResponse, "url", "get")
    .mockReturnValueOnce("http://some.url");
  return mockedResponse;
};

let publicKey: CryptoKey | undefined;
let privateKey: CryptoKey | undefined;

const mockJwk = async (): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}> => {
  if (typeof publicKey === "undefined" || typeof privateKey === "undefined") {
    const generatedPair = await generateKeyPair("ES256", {
      extractable: true,
    });
    publicKey = generatedPair.publicKey;
    privateKey = generatedPair.privateKey;
  }
  return {
    publicKey,
    privateKey,
  };
};

const mockKeyPair = async () => {
  const { privateKey: prvt, publicKey: pblc } = await mockJwk();
  const dpopKeyPair = {
    privateKey: prvt,
    publicKey: await exportJWK(pblc),
  };
  // The alg property isn't set by exportJWK, so set it manually.
  dpopKeyPair.publicKey.alg = "ES256";
  return dpopKeyPair;
};

// Computed independently of the implementation under test.
const expectedAth = (accessToken: string) =>
  createHash("sha256").update(accessToken).digest("base64url");

const mockFetch = (response: Response, url: string) => {
  const mockedResponse = response;
  const fetchSpy = jest.spyOn(globalThis, "fetch");
  jest.spyOn(mockedResponse, "url", "get").mockReturnValue(url);
  fetchSpy.mockResolvedValueOnce(mockedResponse);
  return fetchSpy;
};

describe("buildAuthenticatedFetch", () => {
  const spyTimeout = jest.spyOn(global, "setTimeout");

  afterEach(() => {
    // Clear the latest timeout to avoid dangling open handles.
    // FIXME: Should just use fake timers, but that chokes on recursive calls.
    spyTimeout.mock.results.forEach((handle) => {
      if (handle !== undefined) {
        clearTimeout(handle.value as number);
      }
    });
  });

  it("builds a DPoP fetch if a DPoP key is provided", async () => {
    const mockedFetch = mockFetch(
      new Response(undefined, {
        status: 401,
      }),
      "https://my.pod/resource",
    );
    const keylikePair = await mockJwk();
    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: {
        privateKey: keylikePair.privateKey,
        publicKey: await exportJWK(keylikePair.publicKey),
      },
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: {
          refresh:
            jest.fn<
              (
                ...params: Parameters<ITokenRefresher["refresh"]>
              ) => ReturnType<ITokenRefresher["refresh"]>
            >(),
        },
      },
    });
    await myFetch("https://my.pod/resource");
    expect(mockedFetch.mock.calls[0][0]).toBe("https://my.pod/resource");
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    const decodedHeader = await jwtVerify(
      headers.get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(decodedHeader.payload).toMatchObject({
      htu: "https://my.pod/resource",
    });
  });

  it("builds the appropriate DPoP header for a given HTTP verb.", async () => {
    const mockedFetch = mockFetch(
      mockNotRedirectedResponse(),
      "https://my.pod/resource",
    );

    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("http://some.url", {
      method: "POST",
    });

    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    const { payload } = await jwtVerify(
      headers.get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(payload.htu).toBe("http://some.url/");
    expect(payload.htm).toBe("POST");
  });

  it("binds the DPoP proof to the access token using the 'ath' claim", async () => {
    const mockedFetch = mockFetch(
      mockNotRedirectedResponse(),
      "https://my.pod/resource",
    );
    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("https://my.pod/resource");

    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    const { payload } = await jwtVerify(
      headers.get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(payload.ath).toBe(expectedAth("myToken"));
  });

  it("builds a Bearer fetch if no DPoP key is provided", async () => {
    const mockedFetch = mockFetch(
      new Response(undefined, { status: 401 }),
      "https://my.pod/resource",
    );
    const myFetch = buildAuthenticatedFetch("myToken", undefined);
    await myFetch("https://my.pod/resource");
    expect(mockedFetch.mock.calls[0][0]).toBe("https://my.pod/resource");
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")?.startsWith("Bearer")).toBe(true);
  });

  it("returns a fetch that rebuilds the DPoP token if redirected", async () => {
    const mockedFetch = mockFetch(
      new Response(undefined, { status: 403 }),
      "https://my.pod/container/",
    );
    // Redirects once
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/container/",
      ok: true,
      status: 200,
      headers: new Headers(),
    } as Response);

    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls[1][0]).toBe("https://my.pod/container/");
    const headers = new Headers(mockedFetch.mock.calls[1][1]?.headers);
    const { payload } = await jwtVerify(
      headers.get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(payload.htu).toBe("https://my.pod/container/");
    expect(payload.ath).toBe(expectedAth("myToken"));
  });

  it("returns a fetch that does not retry fetching with a Bearer token if redirected", async () => {
    const mockedFetch = mockFetch(
      new Response(undefined, { status: 403 }),
      "https://my.pod/container/",
    );

    const myFetch = buildAuthenticatedFetch("myToken");
    const response = await myFetch("https://my.pod/container");

    expect(response.status).toBe(403);
    expect(mockedFetch.mock.calls).toHaveLength(1);
  });

  it("returns a fetch preserving optional headers passed as a map", async () => {
    const mockedFetch = mockFetch(
      mockNotRedirectedResponse(),
      "https://my.pod/container/",
    );
    const myFetch = buildAuthenticatedFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);

    expect(headers.get("Authorization")).toBe("Bearer myToken");
    expect(headers.get("someHeader")).toBe("SomeValue");
  });

  it("returns a fetch preserving optional headers passed as a Header object", async () => {
    const mockedFetch = mockFetch(
      mockNotRedirectedResponse(),
      "https://my.pod/container/",
    );
    const myFetch = buildAuthenticatedFetch("myToken", undefined);
    await myFetch("someUrl", {
      headers: new Headers({ someHeader: "SomeValue" }),
    });

    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);

    expect(headers.get("Authorization")).toBe("Bearer myToken");
    expect(headers.get("someHeader")).toBe("SomeValue");
  });

  it("returns a fetch overriding any pre-existing Authorization or DPoP headers", async () => {
    const mockedFetch = mockFetch(
      mockNotRedirectedResponse(),
      "https://my.pod/container/",
    );

    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("http://some.url", {
      headers: {
        Authorization: "some token",
        DPoP: "some header",
      },
    });
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("DPoP myToken");
  });

  it("does not retry a **redirected** fetch if the error is not auth-related", async () => {
    // Mimics a redirect that lead to a non-auth error.
    const mockedFetch = mockFetch(
      new Response(undefined, { status: 400 }),
      "https://my.pod/container/",
    );

    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: await mockKeyPair(),
    });
    const response = await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toBe(400);
  });

  it("returns the initial response in case of non-redirected auth error", async () => {
    mockFetch(
      new Response(undefined, { status: 401 }),
      "https://my.pod/container/",
    );
    const myFetch = buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: {
          refresh: () => {
            throw new Error("Some error");
          },
        },
      },
    });
    const response = await myFetch("someUrl");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(response.status).toBe(401);
  });

  // For some reasons Jest doesn't play nice with timers, so right now the tests
  // run actual timers on very short refresh rates rather than running mock timers.

  // jest.useFakeTimers();
  function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  it("refreshes the token before it expires", async () => {
    const mockRefresher = mockDefaultTokenRefresher();
    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
      },
      expiresIn: 6,
    });
    // It should not refresh the tokens right away...
    expect(mockRefresher.refresh).not.toHaveBeenCalled();
    // Run the timer but not quite close to the token's expiration
    await sleep(500);
    // jest.advanceTimersByTime(1000 * 1000);
    // It should not have refreshed the tokens yet...
    expect(mockRefresher.refresh).not.toHaveBeenCalled();

    await sleep(500);
    // Run the timer to pretend the token is about to expire
    // jest.advanceTimersByTime((800 - REFRESH_BEFORE_EXPIRATION_SECONDS) * 1000);
    expect(mockRefresher.refresh).toHaveBeenCalled();
  });

  it("sets a default timeout if the OIDC provider did not return one", async () => {
    const mockRefresher = mockDefaultTokenRefresher();
    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
        // No expiration date is provided
      },
    });

    expect(spyTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
    );
  });

  it("does not rebind the DPoP token on refresh", async () => {
    const keylikePair = await mockJwk();
    // Mocks a refresher which refreshes only once to prevent re-scheduling timeouts.
    // This would not be necessary with mock timers.
    const mockedTokenRefresher: ITokenRefresher = {
      refresh: jest
        .fn<
          (
            ...params: Parameters<ITokenRefresher["refresh"]>
          ) => ReturnType<ITokenRefresher["refresh"]>
        >()
        .mockResolvedValueOnce({
          ...mockDefaultTokenSet(),
          refreshToken: "some rotated refresh token",
          expiresIn: 0,
        })
        .mockResolvedValue({ ...mockDefaultTokenSet(), expiresIn: 1000 }),
    };
    buildAuthenticatedFetch("myToken", {
      dpopKey: {
        privateKey: keylikePair.privateKey,
        publicKey: await exportJWK(keylikePair.publicKey),
      },
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedTokenRefresher,
      },
      expiresIn: 0,
    });

    await sleep(200);
    // jest.runOnlyPendingTimers();

    expect(mockedTokenRefresher.refresh).toHaveBeenCalledWith(
      expect.anything(),
      "some refresh token",
      {
        privateKey: keylikePair.privateKey,
        publicKey: await exportJWK(keylikePair.publicKey),
      },
    );
  });

  it("binds the DPoP proof to the refreshed access token", async () => {
    // Refreshes only once to prevent re-scheduling timeouts.
    const mockedTokenRefresher: ITokenRefresher = {
      refresh: jest
        .fn<
          (
            ...params: Parameters<ITokenRefresher["refresh"]>
          ) => ReturnType<ITokenRefresher["refresh"]>
        >()
        .mockResolvedValueOnce({ ...mockDefaultTokenSet(), expiresIn: 1000 }),
    };
    const myFetch = buildAuthenticatedFetch("myToken", {
      dpopKey: await mockKeyPair(),
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedTokenRefresher,
      },
      expiresIn: 0,
    });
    await sleep(200);
    expect(mockedTokenRefresher.refresh).toHaveBeenCalled();

    const mockedFetch = mockFetch(
      mockNotRedirectedResponse(),
      "https://my.pod/resource",
    );
    await myFetch("https://my.pod/resource");

    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe(
      `DPoP ${mockDefaultTokenSet().accessToken}`,
    );
    const { payload } = await jwtVerify(
      headers.get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(payload.ath).toBe(expectedAth(mockDefaultTokenSet().accessToken));
  });

  it("sets up the timeout on refresh so that the tokens keep being valid", async () => {
    const mockRefresher = mockTokenRefresher({
      ...mockDefaultTokenSet(),
      // We get a new expiration date every time we refresh the tokens
      expiresIn: 7,
    });
    const spyTimeout = jest.spyOn(global, "setTimeout");
    const mockedEmitter = new EventEmitter();
    // const handles: ReturnType<typeof setTimeout>[] = [];
    // mockedEmitter.on(EVENTS.TIMEOUT_SET, (handle) => {handles.push(handle); console.log("timeout set")});
    const spiedEmit = jest.spyOn(mockedEmitter, "emit");
    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
      },
      expiresIn: 6,
      eventEmitter: mockedEmitter,
    });
    // Run the timer to pretend the token is about to expire
    // jest.advanceTimersByTime(1800 * 1000);
    await sleep(1000);
    expect(mockRefresher.refresh).toHaveBeenCalled();
    // A new timer should have been set.
    // expect(spyTimeout).toHaveBeenCalledTimes(2);
    expect(spyTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      // 2000 is 7 - 5, which is the number of seconds before refreshing, converted to ms.
      2 * 1000,
    );
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.TIMEOUT_SET,
      expect.anything(),
    );
    // handles.forEach((handle) => { console.log("clearing handle"); clearTimeout(handle)});
  });

  it("sets a default timeout on refresh if the OIDC provider does not return one", async () => {
    const mockRefresher = mockTokenRefresher({
      ...mockDefaultTokenSet(),
      // No new expiration date is provided on refresh
      expiresIn: undefined,
    });
    const spyTimeout = jest.spyOn(global, "setTimeout");
    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
      },
      expiresIn: 6,
    });
    // Run the timer to pretend the token is about to expire
    // jest.runOnlyPendingTimers();
    await sleep(1000);
    expect(mockRefresher.refresh).toHaveBeenCalled();
    // A new timer should have been set.
    expect(spyTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
    );
  });

  it("calls the provided callback when the access token is refreshed", async () => {
    const tokenSet = mockDefaultTokenSet();
    const mockedFreshener = mockTokenRefresher({
      ...tokenSet,
      expiresIn: 1800,
    });
    const eventEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(eventEmitter, "emit");
    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      },
      eventEmitter,
      expiresIn: 0,
    });
    await sleep(200);
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXTENDED, 1800);
  });

  it("rotates the refresh token if a new one is issued", async () => {
    // Mocks a refresher which refreshes only once to prevent re-scheduling timeouts.
    // This would not be necessary with mock timers.
    const mockedTokenRefresher: ITokenRefresher = {
      refresh: jest
        .fn<
          (
            ...params: Parameters<ITokenRefresher["refresh"]>
          ) => ReturnType<ITokenRefresher["refresh"]>
        >()
        .mockResolvedValueOnce({
          ...mockDefaultTokenSet(),
          refreshToken: "some rotated refresh token",
          expiresIn: 0,
        })
        .mockResolvedValue({ ...mockDefaultTokenSet(), expiresIn: 1000 }),
    };
    const refreshCall = jest.spyOn(mockedTokenRefresher, "refresh");

    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedTokenRefresher,
      },
      expiresIn: 0,
    });
    await sleep(200);
    expect(refreshCall.mock.calls[1][1]).toBe("some rotated refresh token");
  });

  it("emits the appropriate events when refreshing the token fails", async () => {
    const mockedFreshener = mockTokenRefresher(mockDefaultTokenSet());
    mockedFreshener.refresh = jest
      .fn<
        (
          ...params: Parameters<ITokenRefresher["refresh"]>
        ) => ReturnType<ITokenRefresher["refresh"]>
      >()
      .mockRejectedValueOnce(
        new OidcProviderError(
          "Some error message",
          "error_identifier",
          "Some error description",
        ),
      ) as any;
    const mockEmitter = new EventEmitter();
    // 'error' events must be listened to.
    mockEmitter.on(EVENTS.ERROR, jest.fn());
    const spiedEmit = jest.spyOn(mockEmitter, "emit");

    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      },
      expiresIn: 0,
      eventEmitter: mockEmitter,
    });
    await sleep(200);
    expect(spiedEmit).toHaveBeenCalledTimes(3);
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.TIMEOUT_SET,
      expect.anything(),
    );
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXPIRED);
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.ERROR,
      "error_identifier",
      "Some error description",
    );
  });

  it("emits the appropriate events when an unexpected response is received", async () => {
    const mockedFreshener = mockTokenRefresher(mockDefaultTokenSet());
    mockedFreshener.refresh = jest
      .fn<
        (
          ...params: Parameters<ITokenRefresher["refresh"]>
        ) => ReturnType<ITokenRefresher["refresh"]>
      >()
      .mockRejectedValueOnce(new InvalidResponseError(["access_token"])) as any;
    const mockEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(mockEmitter, "emit");

    buildAuthenticatedFetch("myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      },
      expiresIn: 0,
      eventEmitter: mockEmitter,
    });
    await sleep(100);
    expect(spiedEmit).toHaveBeenCalledTimes(2);
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.TIMEOUT_SET,
      expect.anything(),
    );
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXPIRED);
  });

  it("emits the appropriate events when the access token expires and may not be refreshed", async () => {
    const mockedFreshener = mockTokenRefresher(mockDefaultTokenSet());

    mockedFreshener.refresh = jest
      .fn<
        (
          ...params: Parameters<ITokenRefresher["refresh"]>
        ) => ReturnType<ITokenRefresher["refresh"]>
      >()
      .mockRejectedValueOnce(new InvalidResponseError(["access_token"])) as any;
    const mockEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(mockEmitter, "emit");

    buildAuthenticatedFetch("myToken", {
      expiresIn: 0,
      eventEmitter: mockEmitter,
    });
    await sleep(100);
    expect(spiedEmit).toHaveBeenCalledTimes(2);
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.TIMEOUT_SET,
      expect.anything(),
    );
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXPIRED);
  });

  it("does not schedule any callback to be called if no event can be fired", async () => {
    const spyTimeout = jest.spyOn(global, "setTimeout");
    buildAuthenticatedFetch("myToken");
    await sleep(100);
    // The only call to setTimeout should come from the `sleep` function
    expect(spyTimeout).toHaveBeenCalledTimes(1);
  });
});

describe("reactive authentication", () => {
  const RESOURCE_URL = "https://rs.example/some/resource";
  const RESOURCE = "https://rs.example";
  const RESOURCE_METADATA_URL =
    "https://rs.example/.well-known/oauth-protected-resource";
  const AS = "https://as.example";
  const AS_METADATA_URL =
    "https://as.example/.well-known/oauth-authorization-server";
  const TOKEN_ENDPOINT = "https://as.example/access/token";
  const EXCHANGED_TOKEN = "some.exchanged.token";
  const ID_TOKEN = "some.id.token";
  const CHALLENGE = `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`;

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    });

  const unauthorized = (wwwAuthenticate?: string, status = 401) => {
    const response = new Response(undefined, {
      status,
      headers:
        wwwAuthenticate === undefined
          ? {}
          : { "WWW-Authenticate": wwwAuthenticate },
    });
    // Not redirected, so that the DPoP replay doesn't kick in.
    jest.spyOn(response, "url", "get").mockReturnValue(RESOURCE_URL);
    return response;
  };

  const asMetadata = (overrides: Record<string, unknown> = {}) => ({
    issuer: AS,
    token_endpoint: TOKEN_ENDPOINT,
    response_types_supported: [],
    grant_types_supported: [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:token-exchange",
    ],
    token_endpoint_auth_methods_supported: ["private_key_jwt", "none"],
    scopes_supported: ["some:scope"],
    client_id_metadata_document_supported: true,
    ...overrides,
  });

  const tokenResponse = (overrides: Record<string, unknown> = {}) => ({
    access_token: EXCHANGED_TOKEN,
    token_type: "Bearer",
    issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
    expires_in: 300,
    ...overrides,
  });

  type Routes = Record<string, Array<Response | Error>>;

  // Responses are served per URL, in order, so that unexpected calls fail loudly.
  const mockRoutes = (routes: Routes) =>
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const target = input.toString();
      const next = routes[target]?.shift();
      if (next === undefined) {
        throw new Error(`Unexpected fetch to ${target}`);
      }
      if (next instanceof Error) {
        throw next;
      }
      return next;
    });

  const successfulRoutes = (
    overrides: {
      challenge?: Response;
      token?: Record<string, unknown>;
    } = {},
  ): Routes => ({
    [RESOURCE_URL]: [
      overrides.challenge ?? unauthorized(CHALLENGE),
      new Response("some content"),
    ],
    [RESOURCE_METADATA_URL]: [
      json({ resource: RESOURCE, authorization_servers: [AS] }),
    ],
    [AS_METADATA_URL]: [json(asMetadata())],
    [TOKEN_ENDPOINT]: [json(tokenResponse(overrides.token))],
  });

  const calledUrls = (fetchSpy: ReturnType<typeof mockRoutes>) =>
    fetchSpy.mock.calls.map(([input]) => input.toString());

  const exchangeRequest = (fetchSpy: ReturnType<typeof mockRoutes>) => {
    const call = fetchSpy.mock.calls.find(
      ([input]) => input.toString() === TOKEN_ENDPOINT,
    );
    return Object.fromEntries(
      new URLSearchParams(call?.[1]?.body as URLSearchParams).entries(),
    );
  };

  let fetchSpy: ReturnType<typeof mockRoutes> | undefined;

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = undefined;
  });

  it("does not attempt discovery if the response has no WWW-Authenticate header", async () => {
    const response = unauthorized();
    fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
    const result = await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
    })(RESOURCE_URL);
    expect(result).toBe(response);
    expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
  });

  it("does not attempt discovery if the challenge has no resource_metadata", async () => {
    const response = unauthorized('Bearer realm="some realm"');
    fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
    const result = await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
    })(RESOURCE_URL);
    expect(result).toBe(response);
    expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
  });

  it("does not attempt discovery for errors which are not auth-related", async () => {
    const response = unauthorized(CHALLENGE, 500);
    fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
    const result = await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
    })(RESOURCE_URL);
    expect(result).toBe(response);
    expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
  });

  it.each([
    ["is not found", new Response(undefined, { status: 404 })],
    ["cannot be fetched", new Error("Network error")],
    ["is not valid JSON", new Response("not JSON")],
    ["has no resource", json({ authorization_servers: [AS] })],
    ["has no authorization server", json({ resource: RESOURCE })],
    [
      "has an empty authorization server list",
      json({ resource: RESOURCE, authorization_servers: [] }),
    ],
  ])(
    "returns the original response if the resource metadata %s",
    async (_, metadataResponse) => {
      const response = unauthorized(CHALLENGE);
      fetchSpy = mockRoutes({
        [RESOURCE_URL]: [response],
        [RESOURCE_METADATA_URL]: [metadataResponse],
      });
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
      })(RESOURCE_URL);
      expect(result).toBe(response);
      expect(calledUrls(fetchSpy)).toStrictEqual([
        RESOURCE_URL,
        RESOURCE_METADATA_URL,
      ]);
    },
  );

  it.each([
    ["is not found", new Response(undefined, { status: 404 })],
    ["cannot be fetched", new Error("Network error")],
    ["is invalid", json({ issuer: AS })],
    [
      "does not support token exchange",
      json(asMetadata({ grant_types_supported: ["client_credentials"] })),
    ],
  ])(
    "returns the original response if the authorization server metadata %s",
    async (_, metadataResponse) => {
      const response = unauthorized(CHALLENGE);
      fetchSpy = mockRoutes({
        [RESOURCE_URL]: [response],
        [RESOURCE_METADATA_URL]: [
          json({ resource: RESOURCE, authorization_servers: [AS] }),
        ],
        [AS_METADATA_URL]: [metadataResponse],
      });
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
      })(RESOURCE_URL);
      expect(result).toBe(response);
      expect(calledUrls(fetchSpy)).toStrictEqual([
        RESOURCE_URL,
        RESOURCE_METADATA_URL,
        AS_METADATA_URL,
      ]);
    },
  );

  it("returns the original response if the token exchange fails", async () => {
    const response = unauthorized(CHALLENGE);
    fetchSpy = mockRoutes({
      ...successfulRoutes({ challenge: response }),
      [TOKEN_ENDPOINT]: [new Response(undefined, { status: 400 })],
    });
    const result = await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
    })(RESOURCE_URL);
    expect(result).toBe(response);
    expect(calledUrls(fetchSpy)).toStrictEqual([
      RESOURCE_URL,
      RESOURCE_METADATA_URL,
      AS_METADATA_URL,
      TOKEN_ENDPOINT,
    ]);
  });

  it("exchanges a token and retries the request with the exchanged token", async () => {
    fetchSpy = mockRoutes(successfulRoutes());
    const result = await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
    })(RESOURCE_URL);

    expect(result.status).toBe(200);
    await expect(result.text()).resolves.toBe("some content");
    expect(calledUrls(fetchSpy)).toStrictEqual([
      RESOURCE_URL,
      RESOURCE_METADATA_URL,
      // The AS metadata URL is derived from the authorization server identifier.
      AS_METADATA_URL,
      TOKEN_ENDPOINT,
      RESOURCE_URL,
    ]);
    const retryHeaders = new Headers(fetchSpy.mock.calls[4][1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe(`Bearer ${EXCHANGED_TOKEN}`);
  });

  it("also attempts discovery on a 403 response", async () => {
    fetchSpy = mockRoutes(
      successfulRoutes({ challenge: unauthorized(CHALLENGE, 403) }),
    );
    const result = await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
    })(RESOURCE_URL);
    expect(result.status).toBe(200);
  });

  it("exchanges the session ID token for the discovered resource and authorization server", async () => {
    fetchSpy = mockRoutes(successfulRoutes());
    await authenticateFetch({ accessToken: "myToken", idToken: ID_TOKEN })(
      RESOURCE_URL,
    );
    expect(exchangeRequest(fetchSpy)).toMatchObject({
      subject_token: ID_TOKEN,
      audience: AS,
      resource: RESOURCE,
    });
  });

  it("preserves the original request options when retrying", async () => {
    fetchSpy = mockRoutes(successfulRoutes());
    await authenticateFetch({ accessToken: "myToken", idToken: ID_TOKEN })(
      RESOURCE_URL,
      {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: "some body",
      },
    );
    const retryInit = fetchSpy.mock.calls[4][1];
    expect(retryInit?.method).toBe("PUT");
    expect(retryInit?.body).toBe("some body");
    expect(new Headers(retryInit?.headers).get("Content-Type")).toBe(
      "text/plain",
    );
  });

  it("uses a Bearer token without a DPoP proof if the exchanged token is not DPoP-bound", async () => {
    fetchSpy = mockRoutes(
      successfulRoutes({ token: { token_type: "Bearer" } }),
    );
    await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
      dpopKey: await mockKeyPair(),
    })(RESOURCE_URL);
    const retryHeaders = new Headers(fetchSpy.mock.calls[4][1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe(`Bearer ${EXCHANGED_TOKEN}`);
    expect(retryHeaders.has("DPoP")).toBe(false);
  });

  it("uses a DPoP proof for the original request if the exchanged token is DPoP-bound", async () => {
    fetchSpy = mockRoutes(successfulRoutes({ token: { token_type: "DPoP" } }));
    await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
      dpopKey: await mockKeyPair(),
    })(RESOURCE_URL);
    const retryHeaders = new Headers(fetchSpy.mock.calls[4][1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe(`DPoP ${EXCHANGED_TOKEN}`);
    const { payload } = await jwtVerify(
      retryHeaders.get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(payload).toMatchObject({
      htu: RESOURCE_URL,
      htm: "GET",
      ath: expectedAth(EXCHANGED_TOKEN),
    });
  });

  it("sends a DPoP proof for the token endpoint if the session is DPoP-bound", async () => {
    fetchSpy = mockRoutes(successfulRoutes());
    await authenticateFetch({
      accessToken: "myToken",
      idToken: ID_TOKEN,
      dpopKey: await mockKeyPair(),
    })(RESOURCE_URL);
    const exchangeCall = fetchSpy.mock.calls.find(
      ([input]) => input.toString() === TOKEN_ENDPOINT,
    );
    const { payload } = await jwtVerify(
      new Headers(exchangeCall?.[1]?.headers).get("DPoP") as string,
      (await mockJwk()).publicKey,
    );
    expect(payload).toMatchObject({
      htu: TOKEN_ENDPOINT,
      htm: "POST",
      ath: expectedAth(ID_TOKEN),
    });
  });

  it("does not attempt a token exchange without an ID token", async () => {
    const response = unauthorized(CHALLENGE);
    fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
    const result = await authenticateFetch({ accessToken: "myToken" })(
      RESOURCE_URL,
    );
    expect(result).toBe(response);
    expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
  });

  it("does not attempt a token exchange from the deprecated builder without an ID token", async () => {
    const response = unauthorized(CHALLENGE);
    fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
    const result = await buildAuthenticatedFetch("myToken")(RESOURCE_URL);
    expect(result).toBe(response);
    expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
  });

  it("exchanges the ID token passed to the deprecated builder", async () => {
    fetchSpy = mockRoutes(successfulRoutes());
    const result = await buildAuthenticatedFetch("myToken", {
      idToken: ID_TOKEN,
    })(RESOURCE_URL);
    expect(result.status).toBe(200);
    expect(exchangeRequest(fetchSpy)).toMatchObject({
      subject_token: ID_TOKEN,
    });
  });

  describe("challenge selection", () => {
    // A second metadata URL, to tell which challenge discovery started from.
    const OTHER_RESOURCE_METADATA_URL = `${RESOURCE_METADATA_URL}/other`;

    const routesFor = (challenge: string, metadataUrl: string): Routes => ({
      ...successfulRoutes({ challenge: unauthorized(challenge) }),
      [metadataUrl]: [
        json({ resource: RESOURCE, authorization_servers: [AS] }),
      ],
    });

    it("uses the Bearer challenge for a session without a DPoP key", async () => {
      fetchSpy = mockRoutes(
        routesFor(
          `DPoP resource_metadata="${OTHER_RESOURCE_METADATA_URL}", Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
          RESOURCE_METADATA_URL,
        ),
      );
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
      })(RESOURCE_URL);
      expect(result.status).toBe(200);
      expect(calledUrls(fetchSpy)[1]).toBe(RESOURCE_METADATA_URL);
    });

    it("prefers the DPoP challenge for a session with a DPoP key", async () => {
      fetchSpy = mockRoutes(
        routesFor(
          `Bearer resource_metadata="${RESOURCE_METADATA_URL}", DPoP resource_metadata="${OTHER_RESOURCE_METADATA_URL}"`,
          OTHER_RESOURCE_METADATA_URL,
        ),
      );
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
        dpopKey: await mockKeyPair(),
      })(RESOURCE_URL);
      expect(result.status).toBe(200);
      expect(calledUrls(fetchSpy)[1]).toBe(OTHER_RESOURCE_METADATA_URL);
    });

    it("uses the Bearer challenge for a session with a DPoP key if there is no DPoP challenge", async () => {
      fetchSpy = mockRoutes(
        routesFor(
          `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
          RESOURCE_METADATA_URL,
        ),
      );
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
        dpopKey: await mockKeyPair(),
      })(RESOURCE_URL);
      expect(result.status).toBe(200);
    });

    it("discovers the resource metadata from the Bearer challenge if the DPoP challenge has none", async () => {
      // The resource metadata identifies the resource, whichever scheme advertises it.
      fetchSpy = mockRoutes(
        routesFor(
          `DPoP algs="ES256 RS256", Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
          RESOURCE_METADATA_URL,
        ),
      );
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
        dpopKey: await mockKeyPair(),
      })(RESOURCE_URL);
      expect(result.status).toBe(200);
    });

    it("does not use a DPoP challenge for a session without a DPoP key", async () => {
      const response = unauthorized(
        `DPoP resource_metadata="${RESOURCE_METADATA_URL}"`,
      );
      fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
      })(RESOURCE_URL);
      expect(result).toBe(response);
      expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
    });

    it("uses a supported challenge next to an unsupported one", async () => {
      fetchSpy = mockRoutes(
        routesFor(
          `Basic realm="some realm", Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
          RESOURCE_METADATA_URL,
        ),
      );
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
      })(RESOURCE_URL);
      expect(result.status).toBe(200);
    });

    it("returns the original response if only unsupported challenges are present", async () => {
      const response = unauthorized('Basic realm="some realm"');
      fetchSpy = mockRoutes({ [RESOURCE_URL]: [response] });
      const result = await authenticateFetch({
        accessToken: "myToken",
        idToken: ID_TOKEN,
      })(RESOURCE_URL);
      expect(result).toBe(response);
      expect(calledUrls(fetchSpy)).toStrictEqual([RESOURCE_URL]);
    });

    it.each([
      ["a Bearer challenge without parameters", "Bearer"],
      ["the ESS Solid JWT challenge", 'DPoP algs="ES256 RS256",Bearer'],
      ["a parameter without a value", "Bearer realm"],
      [
        "a trailing comma",
        `Bearer resource_metadata="${RESOURCE_METADATA_URL}",`,
      ],
    ])("returns a response rather than throwing on %s", async (_, header) => {
      fetchSpy = mockRoutes({
        ...successfulRoutes({ challenge: unauthorized(header) }),
      });
      await expect(
        authenticateFetch({ accessToken: "myToken", idToken: ID_TOKEN })(
          RESOURCE_URL,
        ),
      ).resolves.toBeInstanceOf(Response);
    });
  });

  describe("with token refresh", () => {
    const spyTimeout = jest.spyOn(global, "setTimeout");
    const sleep = (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    afterEach(() => {
      // Clear the scheduled refreshes to avoid dangling open handles.
      spyTimeout.mock.results.forEach((handle) => {
        if (handle !== undefined) {
          clearTimeout(handle.value as number);
        }
      });
    });

    const refreshingFetch = (refreshed: Partial<TokenEndpointResponse>) => {
      // Refreshes once, right away, then schedules the next refresh far away.
      const tokenRefresher: ITokenRefresher = {
        refresh: jest
          .fn<
            (
              ...params: Parameters<ITokenRefresher["refresh"]>
            ) => ReturnType<ITokenRefresher["refresh"]>
          >()
          .mockResolvedValue({
            accessToken: "some refreshed access token",
            expiresIn: 1000,
            ...refreshed,
          }),
      };
      return authenticateFetch(
        {
          accessToken: "myToken",
          idToken: ID_TOKEN,
          refreshToken: "some refresh token",
          expiresIn: 0,
        },
        { refreshOptions: { sessionId: "mySession", tokenRefresher } },
      );
    };

    it("rotates the access token and the ID token on refresh", async () => {
      const myFetch = refreshingFetch({ idToken: "some.refreshed.id.token" });
      await sleep(200);
      fetchSpy = mockRoutes(successfulRoutes());
      await myFetch(RESOURCE_URL);

      expect(
        new Headers(fetchSpy.mock.calls[0][1]?.headers).get("Authorization"),
      ).toBe("Bearer some refreshed access token");
      expect(exchangeRequest(fetchSpy)).toMatchObject({
        subject_token: "some.refreshed.id.token",
      });
    });

    it("keeps the previous ID token if the refresh response has none", async () => {
      const myFetch = refreshingFetch({});
      await sleep(200);
      fetchSpy = mockRoutes(successfulRoutes());
      await myFetch(RESOURCE_URL);

      expect(exchangeRequest(fetchSpy)).toMatchObject({
        subject_token: ID_TOKEN,
      });
    });

    it("does not refresh without a refresh token", async () => {
      const tokenRefresher = mockDefaultTokenRefresher();
      const refreshSpy = jest.spyOn(tokenRefresher, "refresh");
      authenticateFetch(
        { accessToken: "myToken", idToken: ID_TOKEN, expiresIn: 0 },
        { refreshOptions: { sessionId: "mySession", tokenRefresher } },
      );
      await sleep(200);
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("computes the expiration delay from expiresAt if expiresIn is missing", async () => {
      const eventEmitter = new EventEmitter();
      const expired = jest.fn();
      eventEmitter.on(EVENTS.SESSION_EXPIRED, expired);
      authenticateFetch(
        { accessToken: "myToken", expiresAt: Math.trunc(Date.now() / 1000) },
        { eventEmitter },
      );
      await sleep(200);
      expect(expired).toHaveBeenCalledTimes(1);
    });
  });
});
