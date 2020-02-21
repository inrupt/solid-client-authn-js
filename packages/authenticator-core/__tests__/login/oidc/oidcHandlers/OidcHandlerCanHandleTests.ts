import IOidcOptions from "../../../../src/login/oidc/IOidcOptions";
import URL from "url-parse";

// This will be fixed in another pull request
/* eslint-disable @typescript-eslint/camelcase */

const standardOidcOptions: IOidcOptions = {
  issuer: new URL("https://example.com"),
  dpop: true,
  redirectUrl: new URL("https://app.example.com"),
  // This will be fixed in a different pull request
  issuerConfiguration: {
    issuer: new URL("https://example.com"),
    authorization_endpoint: new URL("https://example.com/auth"),
    token_endpoint: new URL("https://example.com/token"),
    jwks_uri: new URL("https://example.com/jwks"),
    subject_types_supported: [],
    claims_supported: []
  }
};

const canHandleTests: {
  [key: string]: {
    oidcOptions: IOidcOptions;
    message: string;
    shouldPass: boolean;
  }[];
} = {
  legacyImplicitFlowOidcHandler: [
    {
      message:
        "should accept a configuration with many grant types including implicit",
      shouldPass: true,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grant_types_supported: ["authorization_code", "implicit", "device"]
        }
      }
    },
    {
      message:
        "should accept a configuration with only the implicit grant type",
      shouldPass: true,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grant_types_supported: ["implicit"]
        }
      }
    },
    {
      message:
        "shouldn't accept a configuration that has many grant types not including implicit",
      shouldPass: false,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grant_types_supported: ["authorization_code", "device"]
        }
      }
    },
    {
      message:
        "shouldn't accept a configuration that does not include grant types",
      shouldPass: false,
      oidcOptions: standardOidcOptions
    }
  ]
};

export default canHandleTests;
