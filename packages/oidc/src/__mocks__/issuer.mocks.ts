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

import { jest } from "@jest/globals";
// eslint-disable-next-line no-shadow
import { Response } from "cross-fetch";
import { JWK, parseJwk, SignJWT } from "@inrupt/jose-legacy-modules";
import { IClient, IIssuerConfig } from "@inrupt/solid-client-authn-core";
import { TokenEndpointInput } from "../dpop/tokenExchange";

export const mockJwk = (): JWK => {
  return {
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  };
};

export const mockIssuer = (): IIssuerConfig => {
  return {
    issuer: "https://some.issuer",
    authorizationEndpoint: "https://some.issuer/autorization",
    tokenEndpoint: "https://some.issuer/token",
    jwksUri: "https://some.issuer/keys",
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public", "pairwise"],
    registrationEndpoint: "https://some.issuer/registration",
    grantTypesSupported: ["authorization_code"],
  };
};

export const mockWebId = (): string => "https://my.webid";

export const mockEndpointInput = (): TokenEndpointInput => {
  return {
    grantType: "authorization_code",
    code: "some code",
    codeVerifier: "some pkce token",
    redirectUrl: "https://my.app/redirect",
  };
};

// The following function is only there to be used manually if
// the JWT needed to be manually re-generated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateMockJwt(): Promise<void> {
  const payload = {
    sub: "https://my.webid",
  };
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256" })
    .setIssuedAt()
    .setIssuer(mockIssuer().issuer.toString())
    .setAudience("solid")
    .setExpirationTime("2h")
    .sign(await parseJwk(mockJwk()));
  // This is for manual use.
  // eslint-disable-next-line no-console
  console.log(jwt.toString());
}

// result of generateMockJwt()
export const mockIdToken = (): string =>
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9zb21lLmlzc3VlciIsImlhdCI6MTYwMjQ5MTk5N30.R0hNKpCR3J8fS6JkTGTuFdz43_2zBMAQvCejSEO5S88DEaMQ4ktOYT__VfPmS7DHLt6Mju-J9bEc4twCnPxXjA";

export type AccessJwt = {
  sub: string;
  iss: string;
  aud: string;
  nbf: number;
  exp: number;
  cnf: {
    jkt: string;
  };
};

export const mockKeyBoundToken = (): AccessJwt => {
  return {
    sub: mockWebId(),
    iss: mockIssuer().issuer.toString(),
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: mockJwk().kid as string,
    },
  };
};

export const mockBearerAccessToken = (): string => "some token";

export type TokenEndpointRawResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
};

export const mockBearerTokens = (): TokenEndpointRawResponse => {
  return {
    access_token: mockBearerAccessToken(),
    id_token: mockIdToken(),
    token_type: "Bearer",
  };
};

export const mockDpopTokens = (): TokenEndpointRawResponse => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
  };
};

export const mockClient = (): IClient => {
  return {
    clientId: "some client",
    clientType: "dynamic",
  };
};

export const mockFetch = (payload: string, statusCode: number) => {
  const mockedFetch = jest.fn(
    async (
      _url: RequestInfo,
      _init?: RequestInit
    ): ReturnType<typeof window.fetch> =>
      new Response(payload, { status: statusCode })
  );
  window.fetch = mockedFetch;
  return mockedFetch;
};
