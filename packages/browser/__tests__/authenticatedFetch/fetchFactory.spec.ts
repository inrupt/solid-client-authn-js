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
import {
  buildBearerFetch,
  buildDpopFetch,
} from "../../src/authenticatedFetch/fetchFactory";
import { decodeJwt, generateJwkForDpop } from "@inrupt/oidc-client-ext";

type MockedRedirectResponse = {
  redirected: boolean;
  url: string;
};

const mockRedirectedResponse = (): MockedRedirectResponse => {
  return {
    redirected: true,
    url: "https://my.pod/container/",
  };
};

const mockNotRedirectedResponse = (): MockedRedirectResponse => {
  return {
    redirected: false,
    url: "https://my.pod/container/",
  };
};

const mockFetch = (
  response: MockedRedirectResponse
): typeof window.fetch => {
  window.fetch = jest.fn().mockReturnValueOnce(
    new Promise((resolve) => {
      resolve(response as Response);
    })
  ) as jest.Mock<
      ReturnType<typeof window.fetch>,
      [RequestInfo, RequestInit?]
    >;
    return window.fetch;
};

// We use ts-ignore comments here only to access mock call arguments
/* eslint-disable @typescript-eslint/ban-ts-ignore */

describe("buildBearerFetch", () => {
  it("returns a fetch holding the provided token", async () => {
    mockFetch(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl");

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("Bearer myToken");
  });

  it("returns a fetch preserving the optional headers", async () => {
    mockFetch(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("Bearer myToken");

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["someHeader"]
    ).toEqual("SomeValue");
  });

  it("returns a fetch overriding any pre-existing authorization headers", async () => {
    mockFetch(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { Authorization: "some token" } });

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("Bearer myToken");
  });
});

describe("buildDpopFetch", () => {
  it("returns a fetch holding the provided token and key", async () => {
    mockFetch(mockNotRedirectedResponse());
    const key = await generateJwkForDpop();
    const myFetch = await buildDpopFetch("myToken", undefined, key);
    await myFetch("http://some.url");

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("DPoP myToken");
    // @ts-ignore
    const dpopHeader = window.fetch.mock.calls[0][1].headers["DPoP"] as string;
    const decodedHeader = await decodeJwt(dpopHeader, key);
    expect(decodedHeader["htu"]).toEqual("http://some.url");
    expect(decodedHeader["htm"]).toEqual("GET");
  });

  it("builds the appropriate DPoP header for a given HTTP verb.", async () => {
    const fetch = mockFetch(mockNotRedirectedResponse());
    const key = await generateJwkForDpop();
    const myFetch = await buildDpopFetch("myToken", undefined,  key);
    await myFetch("http://some.url", {
      method: "POST",
    });

    expect(
      // @ts-ignore
      fetch.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("DPoP myToken");
    // @ts-ignore
    const dpopHeader = fetch.fetch.mock.calls[0][1].headers["DPoP"] as string;
    const decodedHeader = await decodeJwt(dpopHeader, key);
    expect(decodedHeader["htu"]).toEqual("http://some.url");
    expect(decodedHeader["htm"]).toEqual("POST");
  });

  it("returns a fetch preserving the provided optional headers", async () => {
    mockFetch(mockNotRedirectedResponse());
    const key = await generateJwkForDpop();
    const myFetch = await buildDpopFetch("myToken", undefined, key);
    await myFetch("http://some.url", { headers: { someHeader: "SomeValue" } });

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("DPoP myToken");
    // @ts-ignore
    const dpopHeader = window.fetch.mock.calls[0][1].headers["DPoP"] as string;
    const decodedHeader = await decodeJwt(dpopHeader, key);
    expect(decodedHeader["htu"]).toEqual("http://some.url");
    expect(decodedHeader["htm"]).toEqual("GET");

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["someHeader"]
    ).toEqual("SomeValue");
  });

  it("returns a fetch overriding any pre-existing Authorization or DPoP headers", async () => {
    mockFetch(mockNotRedirectedResponse());
    const key = await generateJwkForDpop();
    const myFetch = await buildDpopFetch("myToken", undefined, key);
    await myFetch("http://some.url", {
      headers: {
        Authorization: "some token",
        DPoP: "some header",
      },
    });

    expect(
      // @ts-ignore
      window.fetch.mock.calls[0][1].headers["Authorization"]
    ).toEqual("DPoP myToken");
    // @ts-ignore
    const dpopHeader = window.fetch.mock.calls[0][1].headers["DPoP"] as string;
    const decodedHeader = await decodeJwt(dpopHeader, key);
    expect(decodedHeader["htu"]).toEqual("http://some.url");
    expect(decodedHeader["htm"]).toEqual("GET");
  });

  it("returns a fetch that rebuilds the DPoP token if redirected", async () => {
    const fetch = mockFetch(mockRedirectedResponse());

    const key = await generateJwkForDpop();
    const myFetch = await buildDpopFetch("myToken", undefined, key);
    await myFetch("https://my.pod/container");

    expect(
      // @ts-ignore
      fetch.fetch.mock.calls[1][0]
    ).toEqual("https://my.pod/container/");
  });
});
/* eslint-enable @typescript-eslint/ban-ts-ignore */
