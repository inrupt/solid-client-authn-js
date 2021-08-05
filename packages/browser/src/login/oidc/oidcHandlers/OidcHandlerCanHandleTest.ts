/*
 * Copyright 2021 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { IOidcOptions } from "@inrupt/solid-client-authn-core";
import { standardOidcOptions } from "../__mocks__/IOidcOptions";

const canHandleTests: {
  [key: string]: {
    oidcOptions: IOidcOptions;
    message: string;
    shouldPass: boolean;
  }[];
} = {
  authorizationCodeWithPkceOidcHandler: [
    {
      message:
        "should accept a configuration with many grant types including authorization code",
      shouldPass: true,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code", "implicit", "device"],
        },
      },
    },
    {
      message:
        "should accept a configuration with only the authorization code grant type",
      shouldPass: true,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"],
        },
      },
    },
    {
      message:
        "shouldn't accept a configuration that has many grant types not including authorization code",
      shouldPass: false,
      oidcOptions: {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["implicit", "device"],
        },
      },
    },
    {
      message:
        "shouldn't accept a configuration that does not include grant types",
      shouldPass: false,
      oidcOptions: standardOidcOptions,
    },
  ],
};

export default canHandleTests;
