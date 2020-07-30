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
import DpopAuthenticatedFetcher from "../../../src/authenticatedFetch/dpop/DpopAuthenticatedFetcher";
import URL from "url-parse";
import {
  DpopHeaderCreatorMock,
  DpopHeaderCreatorResponse
} from "../../../src/dpop/__mocks__/DpopHeaderCreator";
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

describe("DpopAuthenticatedFetcher", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    dpopHeaderCreator: DpopHeaderCreatorMock,
    urlRepresentationConverter: UrlRepresentationConverterMock,
    storageUtility: StorageUtilityMock
  };
  function getDpopAuthenticatedFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): DpopAuthenticatedFetcher {
    return new DpopAuthenticatedFetcher(
      mocks.dpopHeaderCreator ?? defaultMocks.dpopHeaderCreator,
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.urlRepresentationConverter ??
        defaultMocks.urlRepresentationConverter,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  describe("canHandle", () => {
    it("accepts configs with type dpop", async () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher();
      expect(
        await dpopAuthenticatedFetcher.canHandle(
          { type: "dpop", localUserId: "global" },
          "http://example.com",
          {}
        )
      ).toBe(true);
    });

    it("rejects configs without type dpop", async () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher();
      expect(
        await dpopAuthenticatedFetcher.canHandle(
          { type: "bearer", localUserId: "global" },
          "http://example.com",
          {}
        )
      ).toBe(false);
    });

    it("rejects configs where the token isn't available", async () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher({
        storageUtility: EmptyStorageUtilityMock
      });
      expect(
        await dpopAuthenticatedFetcher.canHandle(
          { type: "bearer", localUserId: "global" },
          "http://example.com",
          {}
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("should throw an error on a bad config", async () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher();
      await expect(
        dpopAuthenticatedFetcher.handle(
          { type: "bad", localUserId: "global" },
          "https://bad.com",
          {}
        )
      ).rejects.toThrowError(
        'Dpop Authenticated Fetcher cannot handle {"type":"bad","localUserId":"global"}'
      );
    });

    it("handles request properly", async () => {
      const dpopHeaderCreator = DpopHeaderCreatorMock;
      const fetcher = FetcherMock;
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher({
        dpopHeaderCreator: dpopHeaderCreator,
        fetcher: fetcher
      });
      const url = new URL("https://example.com");
      const requestCredentials = {
        type: "dpop",
        localUserId: "global"
      };
      const init = {};
      const response = await dpopAuthenticatedFetcher.handle(
        requestCredentials,
        url.toString(),
        init
      );
      expect(dpopHeaderCreator.createHeaderToken).toHaveBeenCalledWith(
        url,
        "GET"
      );
      expect(fetcher.fetch).toHaveBeenCalledWith(url.toString(), {
        headers: {
          authorization: `DPOP ${StorageUtilityGetResponse}`,
          dpop: DpopHeaderCreatorResponse
        }
      });
      expect(response).toBe(FetcherMockResponse);
    });
  });

  it("preserves the request headers", async () => {
    const dpopHeaderCreator = DpopHeaderCreatorMock;
    const fetcher = FetcherMock;
    const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher({
      dpopHeaderCreator: dpopHeaderCreator,
      fetcher: fetcher
    });
    const url = new URL("https://example.com");
    const requestCredentials = {
      type: "dpop",
      localUserId: "global"
    };
    const init = { headers: { Accept: "text/turtle" } };
    const response = await dpopAuthenticatedFetcher.handle(
      requestCredentials,
      url.toString(),
      init
    );
    expect(dpopHeaderCreator.createHeaderToken).toHaveBeenCalledWith(
      url,
      "GET"
    );
    expect(fetcher.fetch).toHaveBeenCalledWith(url.toString(), {
      headers: {
        authorization: `DPOP ${StorageUtilityGetResponse}`,
        dpop: DpopHeaderCreatorResponse,
        Accept: "text/turtle"
      }
    });
    expect(response).toBe(FetcherMockResponse);
  });
  // TODO: Create a test Where no init is provided
});
