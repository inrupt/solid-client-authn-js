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

import "reflect-metadata";
import { describe, it } from "@jest/globals";
import { JWK, JWT } from "jose";
import {
  buildBearerFetch,
  buildDpopFetch,
  DpopHeaderPayload,
} from "./fetchFactory";

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

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
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

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
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

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
    await myFetch("http://some.url", { headers: { someHeader: "SomeValue" } });

    expect(mockedFetch.mock.calls[0][1].headers.someHeader).toEqual(
      "SomeValue"
    );
  });

  it("returns a fetch overriding any pre-existing Authorization or DPoP headers", async () => {
    const mockedFetch = jest.requireMock("cross-fetch");
    mockedFetch.mockResolvedValueOnce(mockNotRedirectedResponse());

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
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

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
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

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
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

    const myFetch = await buildDpopFetch("myToken", undefined, mockJwk());
    const response = await myFetch("https://my.pod/resource");

    expect(mockedFetch.mock.calls).toHaveLength(1);
    expect(response.status).toEqual(403);
  });
});
