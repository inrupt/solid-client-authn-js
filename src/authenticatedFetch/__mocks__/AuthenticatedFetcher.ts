import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import { FetcherMockResponse } from "../../util/__mocks__/Fetcher";

export const AuthenticatedFetcherResponse = FetcherMockResponse;

export const AuthenticatedFetcherMock: jest.Mocked<IAuthenticatedFetcher> = {
  canHandle: jest.fn(
    async (
      requestCredentials: IRequestCredentials,
      requestInfo: RequestInfo,
      requestInit: RequestInit
    ) => true as boolean
  ),
  handle: jest.fn(
    async (
      requestCredentials: IRequestCredentials,
      requestInfo: RequestInfo,
      requestInit: RequestInit
    ) => AuthenticatedFetcherResponse
  )
};
