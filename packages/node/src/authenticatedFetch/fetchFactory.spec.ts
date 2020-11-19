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
import { JWK } from "jose";
import { fetch as crossFetch } from "cross-fetch";
import { buildBearerFetch, buildDpopFetch } from "./fetchFactory";

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

const mockFetch = (response: MockedRedirectResponse): typeof crossFetch => {
  const fetch = jest.requireMock("cross-fetch");
  fetch.mockReturnValueOnce(
    new Promise((resolve) => {
      resolve(response as Response);
    })
  );
  return fetch;
};

// We use ts-ignore comments here only to access mock call arguments
/* eslint-disable @typescript-eslint/ban-ts-comment */

describe("buildBearerFetch", () => {
  it("returns a fetch holding the provided token", async () => {
    const fetch = mockFetch(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl");

    expect(
      // @ts-ignore
      fetch.mock.calls[0][1].headers.Authorization
    ).toEqual("Bearer myToken");
  });

  it("returns a fetch preserving the optional headers", async () => {
    const fetch = mockFetch(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { someHeader: "SomeValue" } });

    expect(
      // @ts-ignore
      fetch.mock.calls[0][1].headers.Authorization
    ).toEqual("Bearer myToken");

    expect(
      // @ts-ignore
      fetch.mock.calls[0][1].headers.someHeader
    ).toEqual("SomeValue");
  });

  it("returns a fetch overriding any pre-existing authorization headers", async () => {
    const fetch = mockFetch(mockNotRedirectedResponse());
    const myFetch = buildBearerFetch("myToken", undefined);
    await myFetch("someUrl", { headers: { Authorization: "some token" } });

    expect(
      // @ts-ignore
      fetch.mock.calls[0][1].headers.Authorization
    ).toEqual("Bearer myToken");
  });
});

describe("buildDpopFetch", () => {
  it("isn't implemented", async () => {
    // TODO: buildDpopFetch isn't implemented
    await buildDpopFetch(
      "myToken",
      undefined,
      (undefined as unknown) as JWK.ECKey
    );
  });
});
/* eslint-enable @typescript-eslint/ban-ts-comment */
