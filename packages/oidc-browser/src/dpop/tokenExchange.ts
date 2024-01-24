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

import type {
  IClient,
  IIssuerConfig,
  KeyPair,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
import {
  createDpopHeader,
  getWebidFromTokenPayload,
  generateDpopKeyPair,
  OidcProviderError,
  InvalidResponseError,
} from "@inrupt/solid-client-authn-core";

// Identifiers in camelcase are mandated by the OAuth spec.
/* eslint-disable camelcase */

function hasError(
  value: { error: string } | Record<string, unknown>,
): value is { error: string } {
  return value.error !== undefined && typeof value.error === "string";
}

function hasErrorDescription(
  value: { error_description: string } | Record<string, unknown>,
): value is { error_description: string } {
  return (
    value.error_description !== undefined &&
    typeof value.error_description === "string"
  );
}

function hasErrorUri(
  value: { error_uri: string } | Record<string, unknown>,
): value is { error_uri: string } {
  return value.error_uri !== undefined && typeof value.error_uri === "string";
}

function hasAccessToken(
  value: { access_token: string } | Record<string, unknown>,
): value is { access_token: string } {
  return (
    value.access_token !== undefined && typeof value.access_token === "string"
  );
}

function hasIdToken(
  value: { id_token: string } | Record<string, unknown>,
): value is { id_token: string } {
  return value.id_token !== undefined && typeof value.id_token === "string";
}

function hasRefreshToken(
  value: { refresh_token: string } | Record<string, unknown>,
): value is { refresh_token: string } {
  return (
    value.refresh_token !== undefined && typeof value.refresh_token === "string"
  );
}

function hasTokenType(
  value: { token_type: string } | Record<string, unknown>,
): value is { token_type: string } {
  return value.token_type !== undefined && typeof value.token_type === "string";
}

function hasExpiresIn(
  value: { expires_in?: number } | Record<string, unknown>,
): value is { expires_in?: number } {
  return value.expires_in === undefined || typeof value.expires_in === "number";
}

export type CodeExchangeResult = TokenEndpointResponse & {
  // The idToken must not be undefined after the auth code exchange
  idToken: string;
  webId: string;
  dpopKey?: KeyPair;
};

export type TokenEndpointInput = {
  grantType: string;
  redirectUrl: string;
  code: string;
  codeVerifier: string;
};

function validatePreconditions(
  issuer: IIssuerConfig,
  data: TokenEndpointInput,
): void {
  if (
    data.grantType &&
    (!issuer.grantTypesSupported ||
      !issuer.grantTypesSupported.includes(data.grantType))
  ) {
    throw new Error(
      `The issuer [${issuer.issuer}] does not support the [${data.grantType}] grant`,
    );
  }
  if (!issuer.tokenEndpoint) {
    throw new Error(
      `This issuer [${issuer.issuer}] does not have a token endpoint`,
    );
  }
}

export function validateTokenEndpointResponse(
  tokenResponse: Record<string, unknown>,
  dpop: boolean,
): Record<string, unknown> & {
  access_token: string;
  id_token: string;
  expires_in?: number;
} {
  if (hasError(tokenResponse)) {
    throw new OidcProviderError(
      `Token endpoint returned error [${tokenResponse.error}]${
        hasErrorDescription(tokenResponse)
          ? `: ${tokenResponse.error_description}`
          : ""
      }${
        hasErrorUri(tokenResponse) ? ` (see ${tokenResponse.error_uri})` : ""
      }`,
      tokenResponse.error,
      hasErrorDescription(tokenResponse)
        ? tokenResponse.error_description
        : undefined,
    );
  }

  if (!hasAccessToken(tokenResponse)) {
    throw new InvalidResponseError(["access_token"]);
  }

  if (!hasIdToken(tokenResponse)) {
    throw new InvalidResponseError(["id_token"]);
  }

  if (!hasTokenType(tokenResponse)) {
    throw new InvalidResponseError(["token_type"]);
  }

  if (!hasExpiresIn(tokenResponse)) {
    throw new InvalidResponseError(["expires_in"]);
  }

  // TODO: Due to a bug in both the ESS ID broker AND NSS (what were the odds), a DPoP token is returned
  // with a token_type 'Bearer'. To work around this, this test is currently disabled.
  // https://github.com/solid/oidc-op/issues/26
  // Fixed, but unreleased for the ESS (current version: inrupt-oidc-server-0.5.2)
  // if (dpop && tokenResponse.token_type.toLowerCase() !== "dpop") {
  //   throw new Error(
  //     `Invalid token endpoint response: requested a [DPoP] token, but got a 'token_type' value of [${tokenResponse.token_type}].`
  //   );
  // }

  if (!dpop && tokenResponse.token_type.toLowerCase() !== "bearer") {
    throw new Error(
      `Invalid token endpoint response: requested a [Bearer] token, but got a 'token_type' value of [${tokenResponse.token_type}].`,
    );
  }
  return tokenResponse;
}

export async function getTokens(
  issuer: IIssuerConfig,
  client: IClient,
  data: TokenEndpointInput,
  dpop: boolean,
): Promise<CodeExchangeResult> {
  validatePreconditions(issuer, data);
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  let dpopKey: KeyPair | undefined;
  if (dpop) {
    dpopKey = await generateDpopKeyPair();
    headers.DPoP = await createDpopHeader(
      issuer.tokenEndpoint,
      "POST",
      dpopKey,
    );
  }

  // Note: this defaults to client_secret_basic. client_secret_post
  // is currently not supported. See https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication
  // for details.
  if (client.clientSecret) {
    headers.Authorization = `Basic ${btoa(
      `${client.clientId}:${client.clientSecret}`,
    )}`;
  }

  const requestBody = {
    /* eslint-disable camelcase */
    grant_type: data.grantType,
    redirect_uri: data.redirectUrl,
    code: data.code,
    code_verifier: data.codeVerifier,
    client_id: client.clientId,
    /* eslint-enable camelcase */
  };

  const tokenRequestInit: RequestInit & {
    headers: Record<string, string>;
  } = {
    method: "POST",
    headers,
    body: new URLSearchParams(requestBody).toString(),
  };

  const rawTokenResponse = await fetch(issuer.tokenEndpoint, tokenRequestInit);

  const jsonTokenResponse = (await rawTokenResponse.json()) as Record<
    string,
    unknown
  >;

  const tokenResponse = validateTokenEndpointResponse(jsonTokenResponse, dpop);

  const webId = await getWebidFromTokenPayload(
    tokenResponse.id_token,
    issuer.jwksUri,
    issuer.issuer,
    client.clientId,
  );

  return {
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token,
    refreshToken: hasRefreshToken(tokenResponse)
      ? tokenResponse.refresh_token
      : undefined,
    webId,
    dpopKey,
    expiresIn: tokenResponse.expires_in,
  };
}
