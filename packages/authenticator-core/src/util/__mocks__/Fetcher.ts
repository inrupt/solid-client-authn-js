import IRequestCredentials from "../../authenticatedFetch/IRequestCredentials";
import mFetch from "jest-fetch-mock";

import URL from "url-parse";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFetch = mFetch as any;
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function FetcherMocks() {
  const FetcherResponse = mockFetch.mockResponse("someResponse");

  const FetcherMockFunction = jest.fn(
    async (creds: IRequestCredentials, url: URL, init: RequestInit) => {
      return FetcherResponse;
    }
  );

  const FetcherMock = jest.fn(() => ({
    fetch: FetcherMockFunction as any
  }));

  return {
    FetcherResponse,
    FetcherMock,
    FetcherMockFunction
  };
}
