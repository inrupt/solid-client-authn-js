import { IIssuerConfigFetcher } from "../IssuerConfigFetcher";

export const MockIssuerConfigFetcher: jest.Mocked<IIssuerConfigFetcher> = {
  fetchConfig: jest.fn((_issuer: any) =>
    Promise.resolve({ arbitrary: "config" } as any)
  )
};
