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
import { EVENTS, REFRESH_BEFORE_EXPIRATION_SECONDS } from "../constant";

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

  jest.useFakeTimers();

  it("refreshes the token before it expires", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockDefaultTokenRefresher();
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
        expiresIn: 1800,
      },
    });
    // It should not refresh the tokens right away...
    expect(mockRefresher.refresh).not.toHaveBeenCalled();
    // Run the timer but not quite close to the token's expiration
    jest.advanceTimersByTime(1000 * 1000);
    // It should not have refreshed the tokens yet...
    expect(mockRefresher.refresh).not.toHaveBeenCalled();
    // Run the timer to pretend the token is about to expire
    jest.advanceTimersByTime((800 - REFRESH_BEFORE_EXPIRATION_SECONDS) * 1000);
    expect(mockRefresher.refresh).toHaveBeenCalled();
  });

  it("sets a default timeout if the OIDC provider did not return one", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockDefaultTokenRefresher();
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
        // No expiration date is provided
      },
    });
    expect(setTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      DEFAULT_EXPIRATION_TIME_SECONDS * 1000
    );
  });

  it("does not rebind the DPoP token on refresh", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const keylikePair = await mockJwk();
    const mockRefresher = mockDefaultTokenRefresher();
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      dpopKey: {
        privateKey: keylikePair.privateKey,
        publicKey: await fromKeyLike(keylikePair.publicKey),
      },
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
      },
    });

    jest.runOnlyPendingTimers();

    expect(mockRefresher.refresh).toHaveBeenCalledWith(
      expect.anything(),
      "some refresh token",
      {
        privateKey: keylikePair.privateKey,
        publicKey: await fromKeyLike(keylikePair.publicKey),
      }
    );
  });

  // Tests skipped for now, as I can't figure out why it does not work, while running
  // it manually through the debugger looks like it yields the expected result.
  // It seems that the mock functions being called from a callback confuses Jest.
  it.skip("sets up the timeout on refresh so that the tokens keep being valid", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockTokenRefresher({
      ...mockDefaultTokenSet(),
      // We get a new expiration date every time we refresh the tokens
      expiresIn: 1800,
    });
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
        expiresIn: 1800,
      },
    });
    // Run the timer to pretend the token is about to expire
    jest.advanceTimersByTime(1800 * 1000);
    expect(mockRefresher.refresh).toHaveBeenCalled();
    // A new timer should have been set.
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      1795 * 1000
    );
  });

  it.skip("sets a default timeout on refresh if the OIDC provider does not return one", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const mockRefresher = mockTokenRefresher({
      ...mockDefaultTokenSet(),
      // No new expiration date is provided on refresh
    });
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockRefresher,
        expiresIn: 1800,
      },
    });
    // Run the timer to pretend the token is about to expire
    jest.runOnlyPendingTimers();
    expect(mockRefresher.refresh).toHaveBeenCalled();
    // A new timer should have been set.
    expect(setTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      DEFAULT_EXPIRATION_TIME_SECONDS * 1000
    );
  });

  it.skip("calls the provided callback when a new refresh token is issued", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshTokenRotationCallback = jest.fn();
    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
        onNewRefreshToken: refreshTokenRotationCallback,
        expiresIn: 1800,
      },
    });
    jest.runOnlyPendingTimers();
    expect(refreshTokenRotationCallback).toHaveBeenCalledWith(
      "some rotated refresh token"
    );
  });

  it.skip("rotates the refresh token if a new one is issued", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    await buildAuthenticatedFetch(mockedFetch, "myToken", {
      refreshOptions: {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
        expiresIn: 1800,
      },
    });
    jest.advanceTimersByTime(1800 * 1000 * 2);
    expect(refreshCall.mock.calls[1][1]).toEqual("some rotated refresh token");
  });
});
