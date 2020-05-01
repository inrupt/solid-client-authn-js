/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import IOidcOptions from "../../../../src/login/oidc/IOidcOptions";
import { standardOidcOptions } from "../../../../src/login/oidc/__mocks__/IOidcOptions";

// This will be fixed in another pull request
/* eslint-disable @typescript-eslint/camelcase */

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
          grantTypesSupported: ["authorization_code", "implicit", "device"]
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
          grantTypesSupported: ["implicit"]
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
          grantTypesSupported: ["authorization_code", "device"]
        }
      }
    },
    {
      message:
        "shouldn't accept a configuration that does not include grant types",
      shouldPass: false,
      oidcOptions: standardOidcOptions
    }
  ],
  authorizationCodeWithPkceOidcHandler: [
    {
      message:
        "should accept a configuration with many grant types including authorization code",
      shouldPass: true,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code", "implicit", "device"]
        }
      }
    },
    {
      message:
        "should accept a configuration with only the authorization code grant type",
      shouldPass: true,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"]
        }
      }
    },
    {
      message:
        "shouldn't accept a configuration that has many grant types not including authorization code",
      shouldPass: false,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["implicit", "device"]
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
