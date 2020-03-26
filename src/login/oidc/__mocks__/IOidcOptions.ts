import IOidcOptions from "../IOidcOptions";
import URL from "url-parse";

export const standardOidcOptions: IOidcOptions = {
  issuer: new URL("https://example.com"),
  dpop: true,
  redirectUrl: new URL("https://app.example.com"),
  // This will be fixed in a different pull request
  issuerConfiguration: {
    issuer: new URL("https://example.com"),
    authorizationEndpoint: new URL("https://example.com/auth"),
    tokenEndpoint: new URL("https://example.com/token"),
    jwksUri: new URL("https://example.com/jwks"),
    subjectTypesSupported: [],
    claimsSupported: []
  },
  clientId: "coolApp"
};
