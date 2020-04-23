import { IIssuerConfigFetcher } from "../IssuerConfigFetcher";
import URL from "url-parse";
import IIssuerConfig from "../IIssuerConfig";

export const IssuerConfigFetcherFetchConfigResponse: IIssuerConfig = {
  issuer: new URL("https://idp.com"),
  authorizationEndpoint: new URL("https://idp.com/auth"),
  tokenEndpoint: new URL("https://idp.com/token"),
  jwksUri: new URL("https://idp.com/jwks"),
  subjectTypesSupported: [],
  claimsSupported: []
};

export const IssuerConfigFetcherMock: jest.Mocked<IIssuerConfigFetcher> = {
  fetchConfig: jest.fn((_issuer: URL) =>
    Promise.resolve(IssuerConfigFetcherFetchConfigResponse)
  )
};
