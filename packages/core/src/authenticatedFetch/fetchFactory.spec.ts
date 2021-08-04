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
  parseJwk,
  generateKeyPair,
  fromKeyLike,
} from "@inrupt/jose-legacy-modules";
import { EventEmitter } from "events";
import {
  buildAuthenticatedFetch,
  buildBearerFetch,
  buildDpopFetch,
} from "./fetchFactory";
import {
  mockDefaultTokenRefresher,
  mockDefaultTokenSet,
  mockTokenRefresher,
} from "../login/oidc/refresh/__mocks__/TokenRefresher";
import { EVENTS } from "../constant";

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

describe("buildBearerFetch", () => {
  it("returns a fetch holding the provided token", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch(fetch, "myToken", undefined);
    await myFetch("someUrl");

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );
  });

  it("returns a fetch preserving the optional headers", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch(fetch, "myToken", undefined);
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );

    expect(fetch.mock.calls[0][1].headers.someHeader).toEqual("SomeValue");
  });

  it("returns a fetch overriding any pre-existing authorization headers", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch(fetch, "myToken", undefined);
    await myFetch("someUrl", { headers: { Authorization: "some token" } });

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );
  });

  it("returns a fetch that refreshes the token on 401", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = buildBearerFetch(fetch, "myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockDefaultTokenRefresher(),
    });
    await myFetch("someUrl");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(fetch.mock.calls[1][1].headers.Authorization).toEqual(
      "Bearer some refreshed access token"
    );
  });

  it("does not rebind the token on refresh", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({
      status: 401,
      url: "https://somedomain.sometld",
    });
    const dpopKey = await mockKeyPair();
    const myFetch = await buildDpopFetch(fetch, "myToken", dpopKey, {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockDefaultTokenRefresher(),
    });
    await myFetch("https://somedomain.sometld");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is bound to the same DPoP
    // key as the previous access token (which is also the key to which the DPoP
    // token may be bound).
    const dpopHeader = fetch.mock.calls[1][1].headers.DPoP;

    await expect(
      jwtVerify(dpopHeader, await parseJwk(dpopKey.publicKey))
    ).resolves.not.toThrow();
  });

  it("returns a fetch preserving the optional headers even after refresh", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = buildBearerFetch(fetch, "myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockDefaultTokenRefresher(),
    });
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );

    expect(fetch.mock.calls[0][1].headers.someHeader).toEqual("SomeValue");
  });

  it("rotates the refresh token if a new one is issued", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({ status: 401 });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    const myFetch = buildBearerFetch(fetch, "myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedFreshener,
    });
    await myFetch("someUrl");
    // We make two requests in a row to see that the second uses a different refresh token
    await myFetch("someUrl");
    expect(refreshCall.mock.calls[1][1]).toEqual("some rotated refresh token");
  });

  it("returns a fetch that calls the refresh token handler if appropriate", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({ status: 401 });
    const tokenSet = mockDefaultTokenSet();
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const myFetch = buildBearerFetch(fetch, "myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedFreshener,
      eventEmitter: mockEmitter,
    });
    await myFetch("someUrl");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(mockEmit).toHaveBeenCalledWith(EVENTS.NEW_REFRESH_TOKEN);
  });

  it("does not try to refresh on a non-auth error", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({ status: 418 });
    const mockedRefresher = mockDefaultTokenRefresher();
    const refreshCall = jest.spyOn(mockedRefresher, "refresh");

    const myFetch = buildBearerFetch(fetch, "myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedRefresher,
    });
    await myFetch("someUrl");
    expect(refreshCall).not.toHaveBeenCalled();
  });

  it("returns the initial response when the refresh flow fails", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = buildBearerFetch(fetch, "myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: {
        refresh: () => {
          throw new Error("Some error");
        },
      },
    });
    const response = await myFetch("someUrl");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(response.status).toEqual(401);
  });
});

describe("buildDpopFetch", () => {
  it("returns a fetch holding the provided token and key", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
    await myFetch("http://some.url");

    expect(mockedFetch.mock.calls[0][1].headers.Authorization).toEqual(
      "DPoP myToken"
    );

    const dpopHeader = mockedFetch.mock.calls[0][1].headers.DPoP as string;
    const { payload } = await jwtVerify(
      dpopHeader,
      (
        await mockKeyPair()
      ).privateKey
    );
    expect(payload.htu).toEqual("http://some.url/");
    expect(payload.htm).toEqual("GET");
  });

  it("builds the appropriate DPoP header for a given HTTP verb.", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
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

  it("returns a fetch preserving the provided optional headers", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
    await myFetch("http://some.url", { headers: { someHeader: "SomeValue" } });

    expect(mockedFetch.mock.calls[0][1].headers.someHeader).toEqual(
      "SomeValue"
    );
  });

  it("returns a fetch overriding any pre-existing Authorization or DPoP headers", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
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

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
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

  it("does not retry a redirected fetch if the error is not auth-related", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;

    // Mimics a redirect that lead to a non-auth error.
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/container/",
      status: 400,
      ok: false,
    } as Response);

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
    const response = await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toEqual(400);
  });

  it("does not retry a **not** redirected fetch if there was an auth-related issue", async () => {
    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    // Mimics a redirect that lead to a non-auth error.
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/resource",
      status: 403,
      ok: false,
    } as Response);

    const myFetch = await buildDpopFetch(
      mockedFetch,
      "myToken",
      await mockKeyPair()
    );
    const response = await myFetch("https://my.pod/resource");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toEqual(403);
  });

  it("returns a fetch that refreshes the access token on 401", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildDpopFetch(
      fetch,
      "myToken",
      await mockKeyPair(),
      {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockDefaultTokenRefresher(),
      }
    );
    await myFetch("https://my.pod/resource");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(fetch.mock.calls[1][1].headers.Authorization).toEqual(
      "DPoP some refreshed access token"
    );
  });

  it("returns a fetch preserving the optional headers even after refresh", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValueOnce({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildDpopFetch(
      fetch,
      "myToken",
      await mockKeyPair(),
      {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockDefaultTokenRefresher(),
      }
    );
    await myFetch("https://my.pod/resource", {
      headers: { someHeader: "SomeValue" },
    });

    expect(fetch.mock.calls[1][1].headers.Authorization).toEqual(
      "DPoP some refreshed access token"
    );

    expect(fetch.mock.calls[1][1].headers.someHeader).toEqual("SomeValue");
  });

  it("rotates the refresh tokens if a new one is issued", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    const myFetch = await buildDpopFetch(
      fetch,
      "myToken",
      await mockKeyPair(),
      {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      }
    );

    await myFetch("https://my.pod/resource");
    // We make two requests in a row to see that the second uses a different refresh token
    await myFetch("https://my.pod/resource");
    expect(refreshCall.mock.calls[1][1]).toEqual("some rotated refresh token");
  });

  it("calls the refresh token handler if one is provided", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");
    const myFetch = await buildDpopFetch(
      fetch,
      "myToken",
      await mockKeyPair(),
      {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
        eventEmitter: mockEmitter,
      }
    );

    await myFetch("https://my.pod/resource");
    expect(mockEmit).toHaveBeenCalledWith(EVENTS.NEW_REFRESH_TOKEN);
  });

  it("does not try to refresh on a non-auth error", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 418,
      url: "https://my.pod/resource",
    });
    const mockedFreshener = mockDefaultTokenRefresher();
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    const myFetch = await buildDpopFetch(
      fetch,
      "myToken",
      await mockKeyPair(),
      {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: mockedFreshener,
      }
    );
    await myFetch("https://my.pod/resource");
    expect(refreshCall).not.toHaveBeenCalled();
  });

  it("returns the initial response when the refresh flow fails", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildDpopFetch(
      fetch,
      "myToken",
      await mockKeyPair(),
      {
        refreshToken: "some refresh token",
        sessionId: "mySession",
        tokenRefresher: {
          refresh: () => {
            throw new Error("Some error");
          },
        },
      }
    );
    const response = await myFetch("https://my.pod/resource");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the refresh failure is silent.
    expect(response.status).toEqual(401);
  });
});

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

  it("passes the appropriate refresh options to the built fetch if applicable", async () => {
    // eslint-disable-next-line no-shadow
    const fetch = jest.requireMock("cross-fetch") as jest.Mock;
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildAuthenticatedFetch(fetch, "myToken", {
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
    const authorizationHeader = fetch.mock.calls[0][1].headers
      .Authorization as string;
    expect(authorizationHeader.startsWith("Bearer")).toBe(true);
  });
});
