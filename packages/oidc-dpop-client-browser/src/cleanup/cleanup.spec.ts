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

import { it, describe, expect } from "@jest/globals";
import { cleanupRedirectUrl, clearOidcPersistentStorage } from "./cleanup";
import { OidcClient } from "oidc-client";

jest.mock("oidc-client", () => {
  const mockClient = {
    clearStaleState: jest.fn(),
  };
  return {
    OidcClient: jest.fn().mockImplementation(() => {
      return mockClient;
    }),
  };
});

describe("cleanupRedirectUrl", () => {
  it("removes the 'code' query string if present", () => {
    expect(cleanupRedirectUrl("https://some.url/?code=aCode")).toEqual(
      "https://some.url/"
    );
  });

  it("removes the 'state' query string if present", () => {
    expect(cleanupRedirectUrl("https://some.url/?state=arkansas")).toEqual(
      "https://some.url/"
    );
  });

  it("returns an URL without query strings as is", () => {
    expect(cleanupRedirectUrl("https://some.url/")).toEqual(
      "https://some.url/"
    );
  });

  it("preserves other query strings", () => {
    expect(
      cleanupRedirectUrl(
        "https://some.url/?code=someCode&state=someState&otherQuery=aValue"
      )
    ).toEqual("https://some.url/?otherQuery=aValue");
  });
});

describe("clearOidcPersistentStorage", () => {
  it("clears oidc-client storage", async () => {
    // This is a bad test, but I can only test for internal behaviour of oidc-client,
    // or test that the 'clearStaleState' function is called, which is done here.
    await expect(clearOidcPersistentStorage()).resolves;
    expect(new OidcClient({})).toHaveBeenCalled();
  });
});
