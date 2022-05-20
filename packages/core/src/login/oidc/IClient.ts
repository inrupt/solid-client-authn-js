/*
 * Copyright 2022 Inrupt Inc.
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

export interface IPublicIdentifierClientOptions {
  clientId: string;
}

export interface IStaticClientOptions {
  clientId: string;
  clientSecret: string;
}

export interface IDynamicClientOptions {
  clientName?: string;
}

export const ClientTypes = ["static", "dynamic", "solid-oidc"] as const;
export type ClientType = typeof ClientTypes[number];

export interface BaseClient {
  clientType: ClientType;
  clientId: string;
  clientName?: string;
  idTokenSignedResponseAlg?: string;
}

export interface StaticClient extends BaseClient {
  clientType: "static";
  clientSecret: string;
}

export interface DynamicClient extends BaseClient {
  clientType: "dynamic";
  clientSecret: string;
  clientExpiresAt: number;
}

export interface PublicIdentifierClient extends BaseClient {
  clientType: "solid-oidc";
}

export type IClient = PublicIdentifierClient | DynamicClient | StaticClient;
