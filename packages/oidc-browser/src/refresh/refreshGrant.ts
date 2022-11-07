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

import {
  createDpopHeader,
  getWebidFromTokenPayload,
  IClient,
  IIssuerConfig,
  KeyPair,
  TokenEndpointResponse,
  DEFAULT_SCOPES,
} from "@inrupt/solid-client-authn-core";

// NB: once this is rebased on #1560, change dependency to core package.
import { validateTokenEndpointResponse } from "../dpop/tokenExchange";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase */

type IRefreshRequestBody = {
  grant_type: "refresh_token";
  refresh_token: string;
  scope: typeof DEFAULT_SCOPES;
  client_id?: string;
};

const isValidUrl = (url: string): boolean => {
  try {
    // Here, the URL constructor is just called to parse the given string and
    // verify if it is a well-formed IRI.
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Identifiers in snake_case are mandated by the OAuth spec.
/* eslint-disable camelcase */

export async function refresh(
  refreshToken: string,
  issuer: IIssuerConfig,
  client: IClient,
  dpopKey?: KeyPair
): Promise<TokenEndpointResponse> {
  if (client.clientId === undefined) {
    throw new Error(
      "No client ID available when trying to refresh the access token."
    );
  }

  const requestBody: IRefreshRequestBody = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: DEFAULT_SCOPES,
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
  } else if (isValidUrl(client.clientId)) {
    // If the client ID is an URL, and there is no client secret, the client
    // has a Solid-OIDC Client Identifier, and it should be present in the
    // request body.
    requestBody.client_id = client.clientId;
  }

  const rawResponse = await fetch(issuer.tokenEndpoint, {
    method: "POST",
    body: new URLSearchParams(requestBody).toString(),
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
    expiresIn: validatedResponse.expires_in,
  };
}
