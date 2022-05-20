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

import { isObject } from "../../util/isObject";
import { isValidUrl } from "../../util/isValidUrl";

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

// These need to match the defined keys:
const clientPropertyKeys = [
  "clientType",
  "clientId",
  "clientName",
  "idTokenSignedResponseAlg",
  "clientSecret",
  "clientExpiresAt",
];

export function isValidClient(value: any): value is IClient {
  if (!isObject(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.every((key) => clientPropertyKeys.includes(key)) !== true) {
    return false;
  }

  // Validating clientType:
  if (
    typeof value.clientType !== "string" ||
    // we need any here due to how `includes` is typed:
    !ClientTypes.includes(value.clientType as any)
  ) {
    return false;
  }

  // Validating clientId:
  if (typeof value.clientId !== "string") {
    return false;
  }

  // Validating clientName, if it exists:
  if (
    typeof value.clientName !== "undefined" &&
    typeof value.clientName !== "string"
  ) {
    return false;
  }

  // Validating the idTokenSignedResponseAlg value:
  if (
    typeof value.idTokenSignedResponseAlg !== "undefined" &&
    typeof value.idTokenSignedResponseAlg !== "string"
  ) {
    return false;
  }

  // Validating public client identifiers:
  if (value.clientType === "solid-oidc") {
    if (!isValidUrl(value.clientId)) {
      return false;
    }

    if (typeof value.clientSecret !== "undefined") {
      return false;
    }
  }

  // Validating static clients:
  if (value.clientType === "static" && typeof value.clientSecret !== "string") {
    return false;
  }

  // Validating dynamically registered clients:
  if (value.clientType === "dynamic") {
    if (
      typeof value.clientSecret !== "string" ||
      typeof value.clientExpiresAt !== "number" ||
      value.clientExpiresAt < 0
    ) {
      return false;
    }

    // Check clientExpiresAt as being in the future or non-expiring:
    // TODO: test coverage
    if (value.clientExpiresAt !== 0 && value.clientExpiresAt < Date.now()) {
      return false;
    }
  }

  return true;
}
