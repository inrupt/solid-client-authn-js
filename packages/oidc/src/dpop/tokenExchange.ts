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

import formurlencoded from "form-urlencoded";
import { OidcClient } from "@inrupt/oidc-client";
import {
  IClient,
  IIssuerConfig,
  createDpopHeader,
  getWebidFromTokenPayload,
  KeyPair,
  generateDpopKeyPair,
  TokenEndpointResponse,
  OidcProviderError,
  InvalidResponseError,
} from "@inrupt/solid-client-authn-core";

// Identifiers in camelcase are mandated by the OAuth spec.
/* eslint-disable camelcase */

function hasError(
  value: { error: string } | Record<string, unknown>
): value is { error: string } {
  return value.error !== undefined && typeof value.error === "string";
}

function hasErrorDescription(
  value: { error_description: string } | Record<string, unknown>
): value is { error_description: string } {
  return (
    value.error_description !== undefined &&
    typeof value.error_description === "string"
  );
}

function hasErrorUri(
  value: { error_uri: string } | Record<string, unknown>
): value is { error_uri: string } {
  return value.error_uri !== undefined && typeof value.error_uri === "string";
}

function hasAccessToken(
  value: { access_token: string } | Record<string, unknown>
): value is { access_token: string } {
  return (
    value.access_token !== undefined && typeof value.access_token === "string"
  );
}

function hasIdToken(
  value: { id_token: string } | Record<string, unknown>
): value is { id_token: string } {
  return value.id_token !== undefined && typeof value.id_token === "string";
}

function hasRefreshToken(
  value: { refresh_token: string } | Record<string, unknown>
): value is { refresh_token: string } {
  return (
    value.refresh_token !== undefined && typeof value.refresh_token === "string"
  );
}

function hasTokenType(
  value: { token_type: string } | Record<string, unknown>
): value is { token_type: string } {
  return value.token_type !== undefined && typeof value.token_type === "string";
}

function hasExpiresIn(
  value: { expires_in?: number } | Record<string, unknown>
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
  data: TokenEndpointInput
): void {
  if (
    data.grantType &&
    (!issuer.grantTypesSupported ||
      !issuer.grantTypesSupported.includes(data.grantType))
  ) {
    throw new Error(
      `The issuer [${issuer.issuer}] does not support the [${data.grantType}] grant`
    );
  }
  if (!issuer.tokenEndpoint) {
    throw new Error(
      `This issuer [${issuer.issuer}] does not have a token endpoint`
    );
  }
}

export function validateTokenEndpointResponse(
  tokenResponse: Record<string, unknown>,
  dpop: boolean
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
        : undefined
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
      `Invalid token endpoint response: requested a [Bearer] token, but got a 'token_type' value of [${tokenResponse.token_type}].`
    );
  }
  return tokenResponse;
}

export async function getTokens(
  issuer: IIssuerConfig,
  client: IClient,
  data: TokenEndpointInput,
  dpop: true
): Promise<CodeExchangeResult>;
export async function getTokens(
  issuer: IIssuerConfig,
  client: IClient,
  data: TokenEndpointInput,
  dpop: false
): Promise<CodeExchangeResult>;
export async function getTokens(
  issuer: IIssuerConfig,
  client: IClient,
  data: TokenEndpointInput,
  dpop: boolean
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
      dpopKey
    );
  }

  // TODO: Find out where this is specified.
  if (client.clientSecret) {
    headers.Authorization = `Basic ${btoa(
      `${client.clientId}:${client.clientSecret}`
    )}`;
  }

  const tokenRequestInit: RequestInit & {
    headers: Record<string, string>;
  } = {
    method: "POST",
    headers,
    body: formurlencoded({
      /* eslint-disable camelcase */
      grant_type: data.grantType,
      redirect_uri: data.redirectUrl,
      code: data.code,
      code_verifier: data.codeVerifier,
      client_id: client.clientId,
      /* eslint-enable camelcase */
    }),
  };

  const rawTokenResponse = await await fetch(
    issuer.tokenEndpoint,
    tokenRequestInit
  );

  const jsonTokenResponse = (await rawTokenResponse.json()) as Record<
    string,
    unknown
  >;

  const tokenResponse = validateTokenEndpointResponse(jsonTokenResponse, dpop);

  const webId = await getWebidFromTokenPayload(
    tokenResponse.id_token,
    issuer.jwksUri,
    issuer.issuer,
    client.clientId
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

/**
 * This function exchanges an authorization code for a bearer token.
 * Note that it is based on oidc-client-js, and assumes that the same client has
 * been used to issue the initial redirect.
 * @param redirectUrl The URL to which the user has been redirected
 */
export async function getBearerToken(
  redirectUrl: string
): Promise<CodeExchangeResult> {
  let signinResponse;
  try {
    const client = new OidcClient({
      // TODO: We should look at the various interfaces being used for storage,
      //  i.e. between oidc-client-js (WebStorageStoreState), localStorage
      //  (which has an interface Storage), and our own proprietary interface
      //  IStorage - i.e. we should really just be using the browser Web Storage
      //  API, e.g. "stateStore: window.localStorage,".

      // We are instantiating a new instance here, so the only value we need to
      // explicitly provide is the response mode (default otherwise will look
      // for a hash '#' fragment!).
      // eslint-disable-next-line camelcase
      response_mode: "query",
      // The userinfo endpoint on NSS fails, so disable this for now
      // Note that in Solid, information should be retrieved from the
      // profile referenced by the WebId.
      // TODO: Note that this is heavy-handed, and that this userinfo check
      //  verifies that the `sub` claim in the id token you get along with the
      //  access token matches the sub claim associated with the access token at
      //  the userinfo endpoint.
      // That is a useful check, and in the future it should be only disabled
      // against NSS, and not in general.
      // Issue tracker: https://github.com/solid/node-solid-server/issues/1490
      loadUserInfo: false,
    });
    signinResponse = await client.processSigninResponse(redirectUrl);
    if (client.settings.metadata === undefined) {
      throw new Error(
        "Cannot retrieve issuer metadata from client information in storage."
      );
    }
    if (client.settings.metadata.jwks_uri === undefined) {
      throw new Error(
        "Missing some issuer metadata from client information in storage: 'jwks_uri' is undefined"
      );
    }
    if (client.settings.metadata.issuer === undefined) {
      throw new Error(
        "Missing some issuer metadata from client information in storage: 'issuer' is undefined"
      );
    }
    if (client.settings.client_id === undefined) {
      throw new Error(
        "Missing some client information in storage: 'client_id' is undefined"
      );
    }
    const webId = await getWebidFromTokenPayload(
      signinResponse.id_token,
      client.settings.metadata.jwks_uri,
      client.settings.metadata.issuer,
      client.settings.client_id
    );
    return {
      accessToken: signinResponse.access_token,
      idToken: signinResponse.id_token,
      webId,
      // Although not a field in the TypeScript response interface, the refresh
      // token (which can optionally come back with the access token (if, as per
      // the OAuth2 spec, we requested one using the scope of 'offline_access')
      // will be included in the signin response object.
      // eslint-disable-next-line camelcase
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      refreshToken: signinResponse.refresh_token,
    };
  } catch (err) {
    throw new Error(
      `Problem handling Auth Code Grant (Flow) redirect - URL [${redirectUrl}]: ${err}`
    );
  }
}

export async function getDpopToken(
  issuer: IIssuerConfig,
  client: IClient,
  data: TokenEndpointInput
): Promise<CodeExchangeResult> {
  return getTokens(issuer, client, data, true);
}
