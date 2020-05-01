/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
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
  StorageUtilityGetResponse
} from "../../../src/localStorage/__mocks__/StorageUtility";

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

    it("Defaults to an unauthenticated request if the token isn't available", async () => {
      defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(null);
      const fetcher = FetcherMock;
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher({
        fetcher: fetcher
      });
      const url = "http://someurl.com";
      await dpopAuthenticatedFetcher.handle(
        { type: "dpop", localUserId: "global" },
        url
      );
      expect(fetcher.fetch).toHaveBeenCalledWith(url, {
        headers: {}
      });
    });
  });

  // TODO: Create a test Where no init is provided
});
