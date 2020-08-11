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

// Required by TSyringe:
import "reflect-metadata";
import BearerAuthenticatedFetcher from "../../../src/authenticatedFetch/bearer/BearerAuthenticatedFetcher";
import URL from "url-parse";
import {
  FetcherMock,
  FetcherMockResponse
} from "../../../src/util/__mocks__/Fetcher";
import {
  StorageUtilityMock,
  StorageUtilityGetResponse,
  mockStorageUtility
} from "../../../src/storage/__mocks__/StorageUtility";

describe("BearerAuthenticatedFetcher", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    storageUtility: StorageUtilityMock
  };
  function getBearerAuthenticatedFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): BearerAuthenticatedFetcher {
    return new BearerAuthenticatedFetcher(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }
  describe("canHandle", () => {
    it("accepts configs with type bearer", async () => {
      const fetcher = getBearerAuthenticatedFetcher();

      expect(
        await fetcher.canHandle(
          { type: "bearer", localUserId: "global" },
          "http://example.com"
        )
      ).toBe(true);
    });

    it("rejects configs without type bearer", async () => {
      const fetcher = getBearerAuthenticatedFetcher();

      expect(
        await fetcher.canHandle(
          { type: "dpop", localUserId: "global" },
          "http://example.com"
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("throws if the request cannot be handled", async () => {
      const fetcher = getBearerAuthenticatedFetcher();

      await expect(() =>
        fetcher.handle(
          { type: "dpop", localUserId: "global" },
          "http://example.com"
        )
      ).rejects.toThrow(
        'BearerAuthenticatedFetcher cannot handle a request with the credentials [{"type":"dpop","localUserId":"global"}]'
      );
    });

    it("throws if no auth token is found in storage", async () => {
      const fetcher = getBearerAuthenticatedFetcher({
        storageUtility: mockStorageUtility({})
      });
      await expect(() =>
        fetcher.handle(
          { type: "bearer", localUserId: "global" },
          "http://example.com"
        )
      ).rejects.toThrow("No bearer token are available for session [global]");
    });

    it("sends a request with a bearer auth header", async () => {
      const fetcher = FetcherMock;
      const bearerFetcher = getBearerAuthenticatedFetcher({ fetcher });
      await bearerFetcher.handle(
        { type: "bearer", localUserId: "global" },
        "http://example.com"
      );
      expect(fetcher.fetch).toHaveBeenCalledWith("http://example.com", {
        headers: {
          authorization: `Bearer ${StorageUtilityGetResponse}`
        }
      });
    });

    it("preserves the request headers", async () => {
      const fetcher = FetcherMock;
      const bearerFetcher = getBearerAuthenticatedFetcher({ fetcher });
      const init = { headers: { Accept: "text/turtle" } };
      await bearerFetcher.handle(
        { type: "bearer", localUserId: "global" },
        "http://example.com",
        init
      );
      expect(fetcher.fetch).toHaveBeenCalledWith("http://example.com", {
        headers: {
          authorization: `Bearer ${StorageUtilityGetResponse}`,
          Accept: "text/turtle"
        }
      });
    });
  });
});
