/**
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

/**
 * Test for DpopAuthenticatedFetcher
 */
import "reflect-metadata";
import UnauthenticatedFetcher from "../../../src/authenticatedFetch/unauthenticated/UnauthenticatedFetcher";
import {
  FetcherMock,
  FetcherMockResponse
} from "../../../src/util/__mocks__/Fetcher";
import { UrlRepresentationConverterMock } from "../../../src/util/__mocks__/UrlRepresentationConverter";
import {
  StorageUtilityMock,
  StorageUtilityGetResponse,
  EmptyStorageUtilityMock
} from "../../../src/storage/__mocks__/StorageUtility";

describe("UnauthenticatedFetcher", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    urlRepresentationConverter: UrlRepresentationConverterMock,
    storageUtility: StorageUtilityMock
  };
  function getUnauthenticatedFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): UnauthenticatedFetcher {
    return new UnauthenticatedFetcher(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.urlRepresentationConverter ??
        defaultMocks.urlRepresentationConverter,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  describe("canHandle", () => {
    it("accepts any config", async () => {
      const unauthenticatedFetcher = getUnauthenticatedFetcher();
      expect(
        await unauthenticatedFetcher.canHandle(
          { type: "an arbitrary type", localUserId: "an arbitrary id" },
          "http://example.com",
          {}
        )
      ).toBe(true);
    });
  });

  describe("handle", () => {
    it("defaults to an unauthenticated request if the token isn't available", async () => {
      const fetcher = FetcherMock;
      const unauthenticatedFetcher = getUnauthenticatedFetcher({
        fetcher: fetcher,
        storageUtility: EmptyStorageUtilityMock
      });
      const url = "http://someurl.com";
      await unauthenticatedFetcher.handle(
        { type: "any type", localUserId: "any id" },
        url
      );
      expect(fetcher.fetch).toHaveBeenCalledWith(url, {
        headers: {},
        method: "GET"
      });
    });

    it("preserves the request headers", async () => {
      const fetcher = FetcherMock;
      const unauthenticatedFetcher = getUnauthenticatedFetcher({
        fetcher: fetcher,
        storageUtility: EmptyStorageUtilityMock
      });
      const url = "http://someurl.com";
      await unauthenticatedFetcher.handle(
        { type: "any type", localUserId: "any id" },
        url,
        { headers: { Accept: "text/turtle" } }
      );
      expect(fetcher.fetch).toHaveBeenCalledWith(url, {
        headers: { Accept: "text/turtle" },
        method: "GET"
      });
    });

    it("preserves the request method", async () => {
      const fetcher = FetcherMock;
      const unauthenticatedFetcher = getUnauthenticatedFetcher({
        fetcher: fetcher,
        storageUtility: EmptyStorageUtilityMock
      });
      const url = "http://someurl.com";
      await unauthenticatedFetcher.handle(
        { type: "any type", localUserId: "any id" },
        url,
        { method: "HEAD" }
      );
      expect(fetcher.fetch).toHaveBeenCalledWith(url, {
        headers: {},
        method: "HEAD"
      });
    });
  });
  // TODO: Create a test Where no init is provided
});
