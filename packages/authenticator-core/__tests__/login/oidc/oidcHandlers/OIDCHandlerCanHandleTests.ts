import IOIDCOptions from "../../../../src/login/oidc/IOIDCOptions";
import URL from "url-parse";

const standardOIDCOptions: IOIDCOptions = {
  issuer: new URL("https://example.com"),
  dpop: true,
  redirectUrl: new URL("https://app.example.com"),
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
    oidcOptions: IOIDCOptions;
    message: string;
    shouldPass: boolean;
  }[];
} = {
  legacyImplicitFlowOIDCHandler: [
    {
      message:
        "should accept a configuration with many grant types including implicit",
      shouldPass: true,
      oidcOptions: {
        ...standardOIDCOptions,
        issuerConfiguration: {
          ...standardOIDCOptions.issuerConfiguration,
          grant_types_supported: ["authorization_code", "implicit", "device"]
        }
      }
    },
    {
      message:
        "should accept a configuration with only the implicit grant type",
      shouldPass: true,
      oidcOptions: {
        ...standardOIDCOptions,
        issuerConfiguration: {
          ...standardOIDCOptions.issuerConfiguration,
          grant_types_supported: ["implicit"]
        }
      }
    },
    {
      message:
        "shouldn't accept a configuration that has many grant types not including implicit",
      shouldPass: false,
      oidcOptions: {
        ...standardOIDCOptions,
        issuerConfiguration: {
          ...standardOIDCOptions.issuerConfiguration,
          grant_types_supported: ["authorization_code", "device"]
        }
      }
    },
    {
      message:
        "shouldn't accept a configuration that does not include grant types",
      shouldPass: false,
      oidcOptions: standardOIDCOptions
    }
  ]
};

export default canHandleTests;
