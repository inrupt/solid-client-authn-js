/**
 * Test for DpopAuthenticatedFetcher
 */
import "reflect-metadata";
import DpopAuthenticatedFetcher from "../../../src/authenticatedFetch/dpop/DpopAuthenticatedFetcher";
import URL from "url-parse";
import {
  DpopHeaderCreatorMock,
  DpopHeaderCreatorResponse
} from "../../../src/util/dpop/__mocks__/DpopHeaderCreator";
import {
  FetcherMock,
  FetcherMockResponse
} from "../../../src/util/__mocks__/Fetcher";

describe("DpopAuthenticatedFetcher", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    dpopHeaderCreator: DpopHeaderCreatorMock
  };
  function getDpopAuthenticatedFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): DpopAuthenticatedFetcher {
    return new DpopAuthenticatedFetcher(
      mocks.dpopHeaderCreator ?? defaultMocks.dpopHeaderCreator,
      mocks.fetcher ?? defaultMocks.fetcher
    );
  }

  describe("canHandle", () => {
    it("accepts configs with type dpop", async () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher();
      expect(
        await dpopAuthenticatedFetcher.canHandle(
          { type: "dpop" },
          new URL("http://example.com"),
          {}
        )
      ).toBe(true);
    });

    it("rejects configs without type dpop", async () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher();
      expect(
        await dpopAuthenticatedFetcher.canHandle(
          { type: "bearer" },
          new URL("http://example.com"),
          {}
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("should throw an error on a bad config", () => {
      const dpopAuthenticatedFetcher = getDpopAuthenticatedFetcher();
      expect(
        dpopAuthenticatedFetcher.handle(
          { type: "bad" },
          new URL("https://bad.com"),
          {}
        )
      ).rejects.toThrowError();
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
        authToken: "someAuthToken"
      };
      const init = {};
      const response = await dpopAuthenticatedFetcher.handle(
        requestCredentials,
        url,
        init
      );
      expect(dpopHeaderCreator.createHeaderToken).toHaveBeenCalledWith(
        url,
        "GET"
      );
      expect(fetcher.fetch).toHaveBeenCalledWith(url, {
        headers: {
          authorization: `DPOP ${requestCredentials.authToken}`,
          dpop: DpopHeaderCreatorResponse
        }
      });
      expect(response).toBe(FetcherMockResponse);
    });
  });

  // TODO: Create a test Where no init is provided
});
