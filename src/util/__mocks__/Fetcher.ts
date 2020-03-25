import { Response } from "node-fetch";
import { IFetcher } from "../Fetcher";

export const FetcherMockResponse: Response = new Response(
  JSON.stringify({ arbitrary: "response" })
);

export const FetcherMock: jest.Mocked<IFetcher> = {
  fetch: jest.fn(async (_url, _init) => FetcherMockResponse)
};
