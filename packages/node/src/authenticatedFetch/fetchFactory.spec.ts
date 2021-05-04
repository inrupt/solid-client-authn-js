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

import "reflect-metadata";
import { describe, it } from "@jest/globals";
import { JWK, JWT } from "jose";
import {
  buildAuthenticatedFetch,
  buildBearerFetch,
  buildDpopFetch,
  DpopHeaderPayload,
} from "./fetchFactory";
import {
  mockDefaultTokenRefresher,
  mockDefaultTokenSet,
  mockTokenRefresher,
} from "../login/oidc/refresh/__mocks__/TokenRefresher";

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

describe("buildBearerFetch", () => {
  it("returns a fetch holding the provided token", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl");

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );
  });

  it("returns a fetch preserving the optional headers", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );

    expect(fetch.mock.calls[0][1].headers.someHeader).toEqual("SomeValue");
  });

  it("returns a fetch overriding any pre-existing authorization headers", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { Authorization: "some token" } });

    expect(fetch.mock.calls[0][1].headers.Authorization).toEqual(
      "Bearer myToken"
    );
  });

  it("returns a fetch that refreshes the token on 401", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = buildBearerFetch("myToken", {
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

  it("returns a fetch preserving the optional headers even after refresh", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = buildBearerFetch("myToken", {
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
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({ status: 401 });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refresh_token = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    const myFetch = buildBearerFetch("myToken", {
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
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({ status: 401 });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refresh_token = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshHandler = jest.fn();
    const myFetch = buildBearerFetch("myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedFreshener,
      onNewRefreshToken: refreshHandler,
    });
    await myFetch("someUrl");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(refreshHandler).toHaveBeenCalledWith("some rotated refresh token");
  });

  it("does not try to refresh on a non-auth error", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({ status: 418 });
    const mockedRefresher = mockDefaultTokenRefresher();
    const refreshCall = jest.spyOn(mockedRefresher, "refresh");

    const myFetch = buildBearerFetch("myToken", {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedRefresher,
    });
    await myFetch("someUrl");
    expect(refreshCall).not.toHaveBeenCalled();
  });

  it("returns the initial response when the refresh flow fails", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce({ status: 401 });
    const myFetch = buildBearerFetch("myToken", {
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

const mockJwk = (): JWK.ECKey =>
  JWK.asKey({
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  });

describe("buildDpopFetch", () => {
  it("returns a fetch holding the provided token and key", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch("myToken", mockJwk());
    await myFetch("http://some.url");

    expect(mockedFetch.mock.calls[0][1].headers.Authorization).toEqual(
      "DPoP myToken"
    );

    const dpopHeader = mockedFetch.mock.calls[0][1].headers.DPoP as string;
    const decodedHeader = JWT.verify(
      dpopHeader,
      mockJwk()
    ) as DpopHeaderPayload;
    expect(decodedHeader.htu).toEqual("http://some.url/");
    expect(decodedHeader.htm).toEqual("GET");
  });

  it("builds the appropriate DPoP header for a given HTTP verb.", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch("myToken", mockJwk());
    await myFetch("http://some.url", {
      method: "POST",
    });

    const dpopHeader = mockedFetch.mock.calls[0][1].headers.DPoP as string;
    const decodedHeader = JWT.verify(
      dpopHeader,
      mockJwk()
    ) as DpopHeaderPayload;
    expect(decodedHeader.htu).toEqual("http://some.url/");
    expect(decodedHeader.htm).toEqual("POST");
  });

  it("returns a fetch preserving the provided optional headers", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch("myToken", mockJwk());
    await myFetch("http://some.url", { headers: { someHeader: "SomeValue" } });

    expect(mockedFetch.mock.calls[0][1].headers.someHeader).toEqual(
      "SomeValue"
    );
  });

  it("returns a fetch overriding any pre-existing Authorization or DPoP headers", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch("myToken", mockJwk());
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
    const mockedFetch = jest.requireMock("cross-fetch");

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

    const myFetch = await buildDpopFetch("myToken", mockJwk());
    await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls[1][0]).toEqual("https://my.pod/container/");
    const dpopHeader = mockedFetch.mock.calls[1][1].headers.DPoP as string;
    const decodedHeader = JWT.verify(
      dpopHeader,
      mockJwk()
    ) as DpopHeaderPayload;
    expect(decodedHeader.htu).toEqual("https://my.pod/container/");
  });

  it("does not retry a redirected fetch if the error is not auth-related", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");

    // Mimics a redirect that lead to a non-auth error.
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/container/",
      status: 400,
      ok: false,
    } as Response);

    const myFetch = await buildDpopFetch("myToken", mockJwk());
    const response = await myFetch("https://my.pod/container");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toEqual(400);
  });

  it("does not retry a **not** redirected fetch if there was an auth-related issue", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");
    // Mimics a redirect that lead to a non-auth error.
    mockedFetch.mockResolvedValueOnce({
      url: "https://my.pod/resource",
      status: 403,
      ok: false,
    } as Response);

    const myFetch = await buildDpopFetch("myToken", mockJwk());
    const response = await myFetch("https://my.pod/resource");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toEqual(403);
  });

  it("returns a fetch that refreshes the access token on 401", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildDpopFetch("myToken", mockJwk(), {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockDefaultTokenRefresher(),
    });
    await myFetch("https://my.pod/resource");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the mocked refreshed token is used silently.
    expect(fetch.mock.calls[1][1].headers.Authorization).toEqual(
      "DPoP some refreshed access token"
    );
  });

  it("returns a fetch preserving the optional headers even after refresh", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValueOnce({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildDpopFetch("myToken", mockJwk(), {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockDefaultTokenRefresher(),
    });
    await myFetch("https://my.pod/resource", {
      headers: { someHeader: "SomeValue" },
    });

    expect(fetch.mock.calls[1][1].headers.Authorization).toEqual(
      "DPoP some refreshed access token"
    );

    expect(fetch.mock.calls[1][1].headers.someHeader).toEqual("SomeValue");
  });

  it("rotates the refresh tokens if a new one is issued", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refresh_token = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    const myFetch = await buildDpopFetch("myToken", mockJwk(), {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedFreshener,
    });

    await myFetch("https://my.pod/resource");
    // We make two requests in a row to see that the second uses a different refresh token
    await myFetch("https://my.pod/resource");
    expect(refreshCall.mock.calls[1][1]).toEqual("some rotated refresh token");
  });

  it("calls the refresh token handler if one is provided", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refresh_token = "some rotated refresh token";
    const mockedFreshener = mockTokenRefresher(tokenSet);
    const refreshHandler = jest.fn();

    const myFetch = await buildDpopFetch("myToken", mockJwk(), {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedFreshener,
      onNewRefreshToken: refreshHandler,
    });

    await myFetch("https://my.pod/resource");
    expect(refreshHandler).toHaveBeenCalledWith("some rotated refresh token");
  });

  it("does not try to refresh on a non-auth error", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({
      status: 418,
      url: "https://my.pod/resource",
    });
    const mockedFreshener = mockDefaultTokenRefresher();
    const refreshCall = jest.spyOn(mockedFreshener, "refresh");

    const myFetch = await buildDpopFetch("myToken", mockJwk(), {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: mockedFreshener,
    });
    await myFetch("https://my.pod/resource");
    expect(refreshCall).not.toHaveBeenCalled();
  });

  it("returns the initial response when the refresh flow fails", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildDpopFetch("myToken", mockJwk(), {
      refreshToken: "some refresh token",
      sessionId: "mySession",
      tokenRefresher: {
        refresh: () => {
          throw new Error("Some error");
        },
      },
    });
    const response = await myFetch("https://my.pod/resource");
    // The mocked fetch will 401, which triggers the refresh flow.
    // The test checks that the refresh failure is silent.
    expect(response.status).toEqual(401);
  });
});

describe("buildAuthenticatedFetch", () => {
  it("builds a DPoP fetch if a DPoP key is provided", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildAuthenticatedFetch("myToken", {
      dpopKey: mockJwk(),
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
    const decodedHeader = JWT.verify(
      dpopHeader,
      mockJwk()
    ) as DpopHeaderPayload;
    expect(decodedHeader.htu).toEqual("https://my.pod/resource");
  });

  it("builds a Bearer fetch if no DPoP key is provided", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockResolvedValue({
      status: 401,
      url: "https://my.pod/resource",
    });
    const myFetch = await buildAuthenticatedFetch("myToken", undefined);
    await myFetch("https://my.pod/resource");
    expect(fetch.mock.calls[0][0]).toEqual("https://my.pod/resource");
    const authorizationHeader = fetch.mock.calls[0][1].headers
      .Authorization as string;
    expect(authorizationHeader.startsWith("Bearer")).toBe(true);
  });
});
