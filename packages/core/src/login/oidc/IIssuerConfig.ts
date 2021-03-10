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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Interface to define the configuration that an identity provider can return.
 */

/**
 * @hidden
 */
export interface IIssuerConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksUri: string;
  registrationEndpoint?: string;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  responseModesSupported?: string[];
  grantTypesSupported?: string[];
  acrValuesSupported?: string[];
  subjectTypesSupported: string[];
  idTokenSigningAlgValuesSupported?: string[];
  idTokenEncryptionAlgValuesSupported?: string[];
  idTokenEncryptionEncValuesSupported?: string[];
  userinfoSigningAlgValuesSupported?: string[];
  userinfoEncryptionAlgValuesSupported?: string[];
  userinfoEncryptionEncValuesSupported?: string[];
  requestObjectSigningAlgValuesSupported?: string[];
  requestObjectEncryptionAlgValuesSupported?: string[];
  requestObjectEncryptionEncValuesSupported?: string[];
  tokenEndpointAuthMethodsSupported?: string[];
  tokenEndpointAuthSigningAlgValuesSupported?: string[];
  displayValuesSupported?: string[];
  claimTypesSupported?: string[];
  claimsSupported: string[];
  serviceDocumentation?: string[];
  claimsLocalesSupported?: boolean;
  uiLocalesSupported?: boolean;
  claimsParameterSupported?: boolean;
  requestParameterSupported?: boolean;
  requestUriParameterSupported?: boolean;
  requireRequestUriRegistration?: boolean;
  opPolicyUri?: string;
  opTosUri?: string;
  solidOidcSupported?: boolean;
}
