import { IFetcher } from "../Fetcher";
import { Response as NodeResponse } from "node-fetch";

export const FetcherMockResponse: Response = (new NodeResponse(
  JSON.stringify({ arbitrary: "response" })
) as unknown) as Response;

export const FetcherMock: jest.Mocked<IFetcher> = {
  fetch: jest.fn(async (_url, _init) => FetcherMockResponse)
};
