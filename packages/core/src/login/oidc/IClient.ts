//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * @hidden
 * @packageDocumentation
 */

type IClientBase = {
  clientName?: string;
  idTokenSignedResponseAlg?: string;
};

/**
 * @hidden
 */
export type ISolidOidcClient = IClientBase & {
  clientId: string;
  clientType: "solid-oidc";
  // A solid-oidc client has no concept of client secret,
  // but this makes type checking easier in the codebase.
  clientSecret?: undefined;
};

/**
 * @hidden
 */
export type IOpenIdStaticClient = IClientBase & {
  clientId: string;
  clientSecret: string;
  clientType: "static";
};

/**
 * @hidden
 */
export type IOpenIdDynamicClient = IClientBase & {
  clientId: string;
  clientType: "dynamic";
} & ( // The expiration date is required if a secret is present.
    | { clientSecret: string; expiresAt: number }
    | { clientSecret?: undefined; expiresAt?: undefined }
  );

/**
 * @hidden
 */
export type IClient =
  | ISolidOidcClient
  | IOpenIdStaticClient
  | IOpenIdDynamicClient;
