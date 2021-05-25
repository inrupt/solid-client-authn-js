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
import { OidcClient } from "oidc-client";
import { removeOidcQueryParam, clearOidcPersistentStorage } from "./cleanup";

jest.mock("oidc-client", () => {
  const mockClient = {
    clearStaleState: jest.fn(),
  };
  return {
    OidcClient: jest.fn().mockImplementation(() => {
      return mockClient;
    }),
    WebStorageStateStore: jest.fn(),
  };
});

describe("removeOidcQueryParam", () => {
  it("removes the 'code' query string if present", () => {
    expect(removeOidcQueryParam("https://some.url/?code=aCode")).toEqual(
      "https://some.url/"
    );
  });

  it("removes the 'state' query string if present", () => {
    expect(removeOidcQueryParam("https://some.url/?state=arkansas")).toEqual(
      "https://some.url/"
    );
  });

  it("removes the hash part of the IRI", () => {
    expect(removeOidcQueryParam("https://some.url/#some-anchor")).toEqual(
      "https://some.url/"
    );
  });

  it("returns an URL without query strings as is", () => {
    expect(removeOidcQueryParam("https://some.url/")).toEqual(
      "https://some.url/"
    );
  });

  it("preserves other query strings", () => {
    expect(
      removeOidcQueryParam(
        "https://some.url/?code=someCode&state=someState&otherQuery=aValue"
      )
    ).toEqual("https://some.url/?otherQuery=aValue");
  });
});

describe("clearOidcPersistentStorage", () => {
  it("clears oidc-client storage", async () => {
    // This is a bad test, but we can only test for internal behaviour of oidc-client,
    // or test that the 'clearStaleState' function is called, which is done here.
    const clearSpy = jest.spyOn(new OidcClient({}), "clearStaleState");
    await clearOidcPersistentStorage();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("removes keys matching expected patterns as a stopgap solution", async () => {
    window.localStorage.setItem("oidc.someOidcState", "a value");
    window.localStorage.setItem(
      "solidClientAuthenticationUser:someSessionId",
      "a value"
    );
    window.localStorage.setItem("anArbitraryKey", "a value");
    await clearOidcPersistentStorage();
    expect(window.localStorage).toHaveLength(1);
  });

  it("doesn't fail if localstorage is empty", async () => {
    window.localStorage.clear();
    await clearOidcPersistentStorage();
    expect(window.localStorage).toHaveLength(0);
  });
});
