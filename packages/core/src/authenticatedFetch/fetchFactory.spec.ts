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

import { jest, it, describe, expect } from "@jest/globals";
// Until there is a broader support for submodules exports in the ecosystem,
// (e.g. jest supports them), we'll depend on an intermediary package that exports
// a single ES module. The submodule exports should be kept commented out to make
// it easier to transition back when possible.
// import { KeyLike } from "jose/types";
// import jwtVerify from "jose/jwt/verify";
// import { parseJwk } from "jose/jwk/parse";
// import { generateKeyPair } from "jose/util/generate_key_pair";
// import { fromKeyLike } from "jose/jwk/from_key_like";
import {
  KeyLike,
  jwtVerify,
  generateKeyPair,
  fromKeyLike,
} from "@inrupt/jose-legacy-modules";
import { EventEmitter } from "events";
import {
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
import { ITokenRefresher } from "../login/oidc/refresh/ITokenRefresher";

jest.mock("cross-fetch");

type MockedRedirectResponse = {
  redirected: boolean;
  url: string;
};

const mockNotRedirectedResponse = (): MockedRedirectResponse => {
  return {
    redirected: false,
    url: "http://some.url",
  };
};

let publicKey: KeyLike | undefined;
let privateKey: KeyLike | undefined;

const mockJwk = async (): Promise<{
  publicKey: KeyLike;
  privateKey: KeyLike;
}> => {
  if (typeof publicKey === "undefined" || typeof privateKey === "undefined") {
    const generatedPair = await generateKeyPair("ES256");
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
    publicKey: await fromKeyLike(pblc),
  };
  // The alg property isn't set by fromKeyLike, so set it manually.
  dpopKeyPair.publicKey.alg = "ES256";
  return dpopKeyPair;
};

describe("buildAuthenticatedFetch", () => {
  it("builds a DPoP fetch if a DPoP key is provided", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const keylikePair = await mockJwk();
    const myFetch = await buildAuthenticatedFetch(fetch, "myToken", {
      dpopKey: {
        privateKey: keylikePair.privateKey,
        publicKey: await fromKeyLike(keylikePair.publicKey),
      },
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: {
          refresh: jest.fn(),
        },
      },
    });
    await myFetch("https://my.pod/resource");
    expect(fetch.mock.calls[0][0]).toEqual("https://my.pod/resource");
    const dpopHeader = fetch.mock.calls[0][1].headers.DPoP as string;
    const decodedHeader = await jwtVerify(
      dpopHeader,
      (
        await mockJwk()
      ).publicKey
    );
    expect(decodedHeader.payload).toMatchObject({
      htu: "https://my.pod/resource",
    });
  });

  it("builds the appropriate DPoP header for a given HTTP verb.", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildAuthenticatedFetch(mockedFetch, "myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("http://some.url", {
      method: "POST",
    });

    const dpopHeader = mockedFetch.mock.calls[0][1].headers.DPoP as string;
    const { payload } = await jwtVerify(
      dpopHeader,
      (
        await mockKeyPair()
      ).privateKey
    );
    expect(payload.htu).toEqual("http://some.url/");
    expect(payload.htm).toEqual("POST");
  });

  it("builds a Bearer fetch if no DPoP key is provided", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildAuthenticatedFetch(fetch, "myToken", undefined);
    await myFetch("https://my.pod/resource");
    expect(fetch.mock.calls[0][0]).toEqual("https://my.pod/resource");
    const authorizationHeader = fetch.mock.calls[0][1].headers
      .Authorization as string;
    expect(authorizationHeader.startsWith("Bearer")).toBe(true);
  });

  it("returns a fetch that rebuilds the DPoP token if redirected", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;

    // Redirects once
    mockedFetch
      .mockResolvedValueOnce({
        url: "https://my.pod/container/",
        status: 403,
        ok: false,
      } as Response)
      .mockResolvedValueOnce({
        url: "https://my.pod/container/",
        ok: true,
        status: 200,
      } as Response);

    const myFetch = await buildAuthenticatedFetch(mockedFetch, "myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls[1][0]).toEqual("https://my.pod/container/");
    const dpopHeader = mockedFetch.mock.calls[1][1].headers.DPoP as string;
    const { payload } = await jwtVerify(
      dpopHeader,
      (
        await mockKeyPair()
      ).privateKey
    );
    expect(payload.htu).toEqual("https://my.pod/container/");
  });

  it("returns a fetch that does not retry fetching with a Bearer token if redirected", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;

    // Redirects once
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/container/",
      status: 403,
      ok: false,
    } as Response);

    const myFetch = await buildAuthenticatedFetch(mockedFetch, "myToken");
    const response = await myFetch("https://my.pod/container");

    expect(response.status).toBe(403);
    expect(mockedFetch.mock.calls).toHaveLength(1);
  });

  it("returns a fetch preserving the optional headers", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = await buildAuthenticatedFetch(fetch, "myToken", undefined);
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );

    expect(fetch.mock.calls[0][1].headers.someHeader).toEqual("SomeValue");
  });

  it("returns a fetch overriding any pre-existing Authorization or DPoP headers", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildAuthenticatedFetch(mockedFetch, "myToken", {
      dpopKey: await mockKeyPair(),
    });
    await myFetch("http://some.url", {
      headers: {
        Authorization: "some token",
        DPoP: "some header",
      },
    });

    expect(mockedFetch.mock.calls[0][1].headers.Authorization).toEqual(
      "DPoP myToken"
    );
  });

  it("does not retry a **redirected** fetch if the error is not auth-related", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;

    // Mimics a redirect that lead to a non-auth error.
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/container/",
      status: 400,
      ok: false,
    } as Response);

    const myFetch = await buildAuthenticatedFetch(mockedFetch, "myToken", {
      dpopKey: await mockKeyPair(),
    });
    const response = await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toEqual(400);
  });

  it("returns the initial response in case of non-redirected auth error", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = await buildAuthenticatedFetch(fetch, "myToken", {
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
    expect(response.status).toEqual(401);
  });

  // For some reasons Jest doesn't play nice with timers, so right now the tests
  // run actual timers on very short refresh rates rather than running mock timers.

  // jest.useFakeTimers();
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it("refreshes the token before it expires", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockDefaultTokenRefresher();
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
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
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockDefaultTokenRefresher();
    const spyTimeout = jest.spyOn(global, "setTimeout");
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
        // No expiration date is provided
      },
    });

    expect(spyTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      DEFAULT_EXPIRATION_TIME_SECONDS * 1000
    );
  });

  it("does not rebind the DPoP token on refresh", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const keylikePair = await mockJwk();
    // Mocks a refresher which refreshes only once to prevent re-scheduling timeouts.
    // This would not be necessary with mock timers.
    const mockedTokenRefresher: ITokenRefresher = {
      refresh: jest
        .fn<
          ReturnType<ITokenRefresher["refresh"]>,
          Parameters<ITokenRefresher["refresh"]>
        >()
        .mockResolvedValueOnce({
          ...mockDefaultTokenSet(),
          refreshToken: "some rotated refresh token",
          expiresIn: 0,
        })
        .mockResolvedValue({ ...mockDefaultTokenSet(), expiresIn: 1000 }),
    };
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      dpopKey: {
        privateKey: keylikePair.privateKey,
        publicKey: await fromKeyLike(keylikePair.publicKey),
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
        publicKey: await fromKeyLike(keylikePair.publicKey),
      }
    );
  });

  it("sets up the timeout on refresh so that the tokens keep being valid", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockTokenRefresher({
      ...mockDefaultTokenSet(),
      // We get a new expiration date every time we refresh the tokens
      expiresIn: 7,
    });
    const spyTimeout = jest.spyOn(global, "setTimeout");
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
      },
      expiresIn: 6,
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
      2 * 1000
    );
  });

  it("sets a default timeout on refresh if the OIDC provider does not return one", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockTokenRefresher({
      ...mockDefaultTokenSet(),
      // No new expiration date is provided on refresh
      expiresIn: undefined,
    });
    const spyTimeout = jest.spyOn(global, "setTimeout");
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
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
      DEFAULT_EXPIRATION_TIME_SECONDS * 1000
    );
  });

  it("calls the provided callback when the access token is refreshed", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const tokenSet = mockDefaultTokenSet();
    const mockedFreshener = mockTokenRefresher({
      ...tokenSet,
      expiresIn: 1800,
    });
    const eventEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(eventEmitter, "emit");
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
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

  it("calls the provided callback when a new refresh token is issued", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const eventEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(eventEmitter, "emit");
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      },
      eventEmitter,
      expiresIn: 0,
    });
    await sleep(200);
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.NEW_REFRESH_TOKEN,
      "some rotated refresh token"
    );
  });

  it("rotates the refresh token if a new one is issued", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    // Mocks a refresher which refreshes only once to prevent re-scheduling timeouts.
    // This would not be necessary with mock timers.
    const mockedTokenRefresher: ITokenRefresher = {
      refresh: jest
        .fn<
          ReturnType<ITokenRefresher["refresh"]>,
          Parameters<ITokenRefresher["refresh"]>
        >()
        .mockResolvedValueOnce({
          ...mockDefaultTokenSet(),
          refreshToken: "some rotated refresh token",
          expiresIn: 0,
        })
        .mockResolvedValue({ ...mockDefaultTokenSet(), expiresIn: 1000 }),
    };
    const refreshCall = jest.spyOn(mockedTokenRefresher, "refresh");

    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedTokenRefresher,
      },
      expiresIn: 0,
    });
    await sleep(200);
    expect(refreshCall.mock.calls[1][1]).toEqual("some rotated refresh token");
  });

  it("emits the appropriate events when refreshing the token fails", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockedFreshener = mockTokenRefresher(mockDefaultTokenSet());
    mockedFreshener.refresh = jest
      .fn()
      .mockRejectedValueOnce(
        new OidcProviderError(
          "Some error message",
          "error_identifier",
          "Some error description"
        )
      ) as any;
    const mockEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(mockEmitter, "emit");

    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      },
      expiresIn: 0,
      eventEmitter: mockEmitter,
    });
    await sleep(200);
    expect(spiedEmit).toHaveBeenCalledTimes(2);
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXPIRED);
    expect(spiedEmit).toHaveBeenCalledWith(
      EVENTS.ERROR,
      "error_identifier",
      "Some error description"
    );
  });

  it("emits the appropriate events when an unexpected response is received", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockedFreshener = mockTokenRefresher(mockDefaultTokenSet());
    mockedFreshener.refresh = jest
      .fn()
      .mockRejectedValueOnce(new InvalidResponseError(["access_token"])) as any;
    const mockEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(mockEmitter, "emit");

    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      },
      expiresIn: 0,
      eventEmitter: mockEmitter,
    });
    await sleep(100);
    expect(spiedEmit).toHaveBeenCalledTimes(1);
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXPIRED);
  });

  it("emits the appropriate events when the access token expires and may not be refreshed", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockedFreshener = mockTokenRefresher(mockDefaultTokenSet());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedFreshener.refresh = jest
      .fn()
      .mockRejectedValueOnce(new InvalidResponseError(["access_token"])) as any;
    const mockEmitter = new EventEmitter();
    const spiedEmit = jest.spyOn(mockEmitter, "emit");

    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      expiresIn: 0,
      eventEmitter: mockEmitter,
    });
    await sleep(100);
    expect(spiedEmit).toHaveBeenCalledTimes(1);
    expect(spiedEmit).toHaveBeenCalledWith(EVENTS.SESSION_EXPIRED);
  });

  it("does not schedule any callback to be called if no event can be fired", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const spyTimeout = jest.spyOn(global, "setTimeout");
    await buildAuthenticatedFetch(mockedFetch, "myToken");
    await sleep(100);
    // The only call to setTimeout should come from the `sleep` function
    expect(spyTimeout).toHaveBeenCalledTimes(1);
  });
});
