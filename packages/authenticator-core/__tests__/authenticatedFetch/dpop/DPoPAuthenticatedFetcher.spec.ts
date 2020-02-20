/**
 * Test for DPoPAuthenticatedFetcher
 */
import "reflect-metadata";
import DPoPAuthenticatedFetcher from "../../../src/authenticatedFetch/dPoP/DPoPAuthenticatedFetcher";
import URL from "url-parse";
import DPoPHeaderCreatorMocks from "../../util/dpop/DPoPHeaderCreator.mock";
import FetcherMocks from "../../util/Fetcher.mock";

describe("DPoPAuthenticatedFetcher", () => {
  function mockLibrary() {
    const dPoPHeaderCreatorMocks = DPoPHeaderCreatorMocks();
    const fetcherMocks = FetcherMocks();
    return {
      ...dPoPHeaderCreatorMocks,
      ...fetcherMocks,
      dPoPAuthenticatedFetcher: new DPoPAuthenticatedFetcher(
        dPoPHeaderCreatorMocks.DPoPHeaderCreatorMock(),
        fetcherMocks.FetcherMock()
      )
    };
  }

  describe("canHandle", () => {
    it("accepts configs with type dpop", async () => {
      const mocks = mockLibrary();
      expect(
        await mocks.dPoPAuthenticatedFetcher.canHandle(
          { type: "dpop" },
          new URL("http://example.com"),
          {}
        )
      ).toBe(true);
    });

    it("rejects configs without type dpop", async () => {
      const mocks = mockLibrary();
      expect(
        await mocks.dPoPAuthenticatedFetcher.canHandle(
          { type: "bearer" },
          new URL("http://example.com"),
          {}
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("should throw an error on a bad config", () => {
      const mocks = mockLibrary();
      expect(
        mocks.dPoPAuthenticatedFetcher.handle(
          { type: "bad" },
          new URL("https://bad.com"),
          {}
        )
      ).rejects.toThrowError();
    });

    it("handles request properly", async () => {
      const mocks = mockLibrary();
      const url = new URL("https://example.com");
      const requestCredentials = {
        type: "dpop",
        authToken: "someAuthToken"
      };
      const init = {};
      const response = await mocks.dPoPAuthenticatedFetcher.handle(
        requestCredentials,
        url,
        init
      );
      expect(mocks.DPoPHeaderCreatorMockFunction).toHaveBeenCalledWith(
        url,
        "GET"
      );
      expect(mocks.FetcherMockFunction).toHaveBeenCalledWith(url, {
        headers: {
          authorization: `DPOP ${requestCredentials.authToken}`,
          dpop: mocks.DPoPHeaderCreatorResponse
        }
      });
      expect(response).toBe(mocks.FetcherResponse);
    });
  });

  // TODO: Create a test Where no init is provided
});
