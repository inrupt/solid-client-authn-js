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

import {
  createDpopHeader,
  getWebidFromTokenPayload,
  IClient,
  IIssuerConfig,
  KeyPair,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
// NB: once this is rebased on #1560, change dependency to core package.
import formUrlEncoded from "form-urlencoded";
import { validateTokenEndpointResponse } from "../dpop/tokenExchange";

// Identifiers in snake_case are mandated by the OAuth spec.
/* eslint-disable camelcase */

export async function refresh(
  refreshToken: string,
  issuer: IIssuerConfig,
  client: IClient,
  dpopKey?: KeyPair
): Promise<TokenEndpointResponse> {
  const requestBody = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "openid offline_access",
  };

  let dpopHeader = {};
  if (dpopKey !== undefined) {
    dpopHeader = {
      DPoP: await createDpopHeader(issuer.tokenEndpoint, "POST", dpopKey),
    };
  }

  let authHeader = {};
  if (client.clientSecret !== undefined) {
    authHeader = {
      // We assume that client_secret_basic is the client authentication method.
      // TODO: Get the authentication method from the IClient configuration object.
      Authorization: `Basic ${btoa(
        `${client.clientId}:${client.clientSecret}`
      )}`,
    };
  }

  const rawResponse = await fetch(issuer.tokenEndpoint, {
    method: "POST",
    body: formUrlEncoded(requestBody),
    headers: {
      ...dpopHeader,
      ...authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  let response;
  try {
    response = await rawResponse.json();
  } catch (e) {
    // The response is left out of the error on purpose not to leak any sensitive information.
    throw new Error(
      `The token endpoint of issuer ${issuer.issuer} returned a malformed response.`
    );
  }
  const validatedResponse = validateTokenEndpointResponse(
    response,
    dpopKey !== undefined
  );
  const webId = await getWebidFromTokenPayload(
    validatedResponse.id_token,
    issuer.jwksUri,
    issuer.issuer,
    client.clientId
  );
  return {
    accessToken: validatedResponse.access_token,
    idToken: validatedResponse.id_token,
    refreshToken:
      typeof validatedResponse.refresh_token === "string"
        ? validatedResponse.refresh_token
        : undefined,
    webId,
    dpopKey,
  };
}
