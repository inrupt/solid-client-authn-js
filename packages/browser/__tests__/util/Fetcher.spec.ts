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

import Fetcher from "../../src/util/Fetcher";
import URL from "url-parse";

jest.mock("cross-fetch");

describe("UuidGenerator", () => {
  it("should make a fetch given a string", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockReturnValueOnce(Promise.resolve("some response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch("https://someurl.com")).toBe("some response");
  });

  it("should make a fetch given a URL", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockReturnValueOnce(Promise.resolve("some response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch(new URL("https://someurl.com"))).toBe(
      "some response"
    );
  });
});

describe("Browser behaviour", () => {
  it("should default to the environment's fetch if available", async () => {
    const mockCrossFetch = jest.requireMock("cross-fetch");
    mockCrossFetch.mockReturnValueOnce(Promise.resolve("cross-fetch response"));
    window.fetch = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve("browser fetch response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch("https://someurl.com")).toBe(
      "browser fetch response"
    );
    expect(mockCrossFetch.mock.calls.length).toEqual(0);
  });
});
