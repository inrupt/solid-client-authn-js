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

import { appendToUrlPathname } from "./urlPath";

describe("urlPath", () => {
  it("should remove one slash if empty path", () => {
    expect(appendToUrlPathname("https://ex.com/", "/test")).toBe(
      "https://ex.com/test"
    );

    expect(
      appendToUrlPathname("https://ex.com/", "////only-remove-one-slash")
    ).toBe("https://ex.com////only-remove-one-slash");
  });

  it("should remove one slash if non-empty path", () => {
    expect(appendToUrlPathname("https://ex.com/a/", "/test")).toBe(
      "https://ex.com/a/test"
    );

    expect(
      appendToUrlPathname("https://ex.com/a/", "////only-remove-one-slash")
    ).toBe("https://ex.com/a////only-remove-one-slash");
  });

  it("should add a slash before appending slash", () => {
    expect(appendToUrlPathname("https://ex.com", "test")).toBe(
      "https://ex.com/test"
    );

    expect(appendToUrlPathname("https://ex.com/a", "test")).toBe(
      "https://ex.com/a/test"
    );
  });

  it("should throw a helpful error if URL is invalid", () => {
    // Regular expression here simply says "match against 1st string, followed
    // anywhere later by the second, followed anywhere later by the third".
    expect(() => appendToUrlPathname("not an iri", "test ending")).toThrow(
      /test ending.*not an iri.*Invalid URL/
    );
  });
});
