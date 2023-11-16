//
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

import { it, describe, expect } from "@jest/globals";
import { isValidRedirectUrl, removeOpenIdParams } from "./redirectIriUtils";

describe("isValidRedirectUrl", () => {
  it("returns false if the provided IRI is malformed", () => {
    expect(isValidRedirectUrl("not an IRI")).toBe(false);
  });

  it("returns false if the provided IRI contains a hash fragment", () => {
    expect(
      isValidRedirectUrl("https://example.org/redirect#some-fragment"),
    ).toBe(false);
  });

  it("returns true for a valid redirect IRI", () => {
    expect(isValidRedirectUrl("https://example.org/")).toBe(true);
    expect(isValidRedirectUrl("https://example.org/some/path")).toBe(true);
    expect(
      isValidRedirectUrl(
        "https://example.org/?param=value&otherParam=otherValue",
      ),
    ).toBe(true);
  });
});

describe("removeOpenIdParams", () => {
  it("removes the auth code query parameters", () => {
    expect(
      removeOpenIdParams("https://example.org/callback?code=1234&state=5678")
        .href,
    ).toBe("https://example.org/callback");
  });
  it("removes the error query parameters", () => {
    expect(
      removeOpenIdParams(
        "https://example.org/callback?error=1234&error_description=5678",
      ).href,
    ).toBe("https://example.org/callback");
  });

  it("removes the RFC9207 query parameters", () => {
    expect(
      removeOpenIdParams("https://example.org/callback?iss=1234").href,
    ).toBe("https://example.org/callback");
  });
});
