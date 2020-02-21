/**
 * Test for DpopAuthenticatedFetcher
 */
import "reflect-metadata";
import DpopAuthenticatedFetcher from "../../../src/authenticatedFetch/dpop/DpopAuthenticatedFetcher";
import URL from "url-parse";
import DpopHeaderCreatorMocks from "../../util/dpop/DpopHeaderCreator.mock";
import FetcherMocks from "../../util/Fetcher.mock";

describe("DpopAuthenticatedFetcher", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function mockLibrary() {
    const dpopHeaderCreatorMocks = DpopHeaderCreatorMocks();
    const fetcherMocks = FetcherMocks();
    return {
      ...dpopHeaderCreatorMocks,
      ...fetcherMocks,
      dpopAuthenticatedFetcher: new DpopAuthenticatedFetcher(
        dpopHeaderCreatorMocks.DpopHeaderCreatorMock(),
        fetcherMocks.FetcherMock()
      )
    };
  }

  describe("canHandle", () => {
    it("accepts configs with type dpop", async () => {
      const mocks = mockLibrary();
      expect(
        await mocks.dpopAuthenticatedFetcher.canHandle(
          { type: "dpop" },
          new URL("http://example.com"),
          {}
        )
      ).toBe(true);
    });

    it("rejects configs without type dpop", async () => {
      const mocks = mockLibrary();
      expect(
        await mocks.dpopAuthenticatedFetcher.canHandle(
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
        mocks.dpopAuthenticatedFetcher.handle(
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
      const response = await mocks.dpopAuthenticatedFetcher.handle(
        requestCredentials,
        url,
        init
      );
      expect(mocks.DpopHeaderCreatorMockFunction).toHaveBeenCalledWith(
        url,
        "GET"
      );
      expect(mocks.FetcherMockFunction).toHaveBeenCalledWith(url, {
        headers: {
          authorization: `DPOP ${requestCredentials.authToken}`,
          dpop: mocks.DpopHeaderCreatorResponse
        }
      });
      expect(response).toBe(mocks.FetcherResponse);
    });
  });

  // TODO: Create a test Where no init is provided
});
