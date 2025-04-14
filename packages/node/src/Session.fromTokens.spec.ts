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

import { jest, it, describe, expect } from "@jest/globals";
import { type SessionTokenSet } from "core";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import type * as Jose from "jose";
import type * as OpenIdClient from "openid-client";
import { Session } from "./Session";

jest.mock("jose", () => {
  const actualJose = jest.requireActual("jose") as typeof Jose;
  return {
    ...actualJose,
    createRemoteJWKSet: jest.fn(),
  };
});

// Mock the OP configuration discovery.
jest.mock("openid-client", () => {
  const actualOpenidClient = jest.requireActual(
    "openid-client",
  ) as typeof OpenIdClient;
  return {
    ...actualOpenidClient,
    Issuer: {
      discover: jest.fn().mockResolvedValue({
        metadata: {
          issuer: "https://my.idp/",
          authorization_endpoint: "https://my.idp/auth",
          token_endpoint: "https://my.idp/token",
          registration_endpoint: "https://my.idp/register",
          jwks_uri: "https://my.idp/jwks",
          claims_supported: ["sub"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["ES256", "RS256"],
          grant_types_supported: [
            "authorization_code",
            "refresh_token",
            "client_credentials",
          ],
          end_session_endpoint: "https://my.idp/endSessionEndpoint",
        },
      } as never),
    },
  };
});

describe("Session.fromTokens", () => {
  const mockWebid = "https://example.com/profile#me";
  const mockClientId = "client123";
  const mockIssuer = "https://example.com";
  const mockIdToken = async (payload: Jose.JWTPayload) => {
    const issuerKeyPair = await generateKeyPair("ES256");
    // Mock the issuer JWKS.
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue(issuerKeyPair.publicKey),
    );
    return new SignJWT({
      sub: "user123",
      webid: payload.webid ?? mockWebid,
      iss: mockIssuer,
      aud: mockClientId,
      exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .sign(issuerKeyPair.privateKey);
  };

  it("creates a session with the provided tokens", async () => {
    const mockedIdToken = await mockIdToken({});
    const tokenSet: SessionTokenSet = {
      accessToken: "access.token.jwt",
      idToken: mockedIdToken,
      clientId: mockClientId,
      issuer: mockIssuer,
      // Expiration date is in the future.
      expiresAt: Date.now() + 3600,
      webId: mockWebid,
    };

    const session = await Session.fromTokens(tokenSet, "custom-session-id");

    expect(session).toBeInstanceOf(Session);
    expect(session.info.sessionId).toBe("custom-session-id");
    expect(session.info.isLoggedIn).toBe(true);
    expect(session.fetch).toBeDefined();

    // The session being logged in means the provided token
    // will be used to make authenticated fetches.
    const globalFetch = globalThis.fetch;
    let headers: Headers;
    globalThis.fetch = (async (input, init) => {
      // Capture the fetch headers.
      headers = new Headers(init?.headers);
      return new Response();
    }) as typeof fetch;
    await session.fetch("https://some.resource");
    // @ts-expect-error We know headers is initialized.
    expect(headers.get("Authorization")).toBe(`Bearer ${mockedIdToken}`);
    globalThis.fetch = globalFetch;
  });

  it("creates a session with DPoP token if dpopKey is provided", async () => {
    const dpopKeyPair = await generateKeyPair("ES256");

    const dpopKey = {
      privateKey: dpopKeyPair.privateKey,
      publicKey: await exportJWK(dpopKeyPair.publicKey),
    };

    const mockedIdToken = await mockIdToken({});
    const tokenSet: SessionTokenSet = {
      accessToken: "access.token.jwt",
      idToken: mockedIdToken,
      clientId: mockClientId,
      issuer: mockIssuer,
      webId: mockWebid,
      dpopKey,
    };

    const session = await Session.fromTokens(tokenSet);

    // Check that the fetch is authenticated with
    // a DPoP header.
    const globalFetch = globalThis.fetch;
    let headers: Headers;
    globalThis.fetch = (async (input, init) => {
      // Capture the fetch headers.
      headers = new Headers(init?.headers);
      return new Response();
    }) as typeof fetch;
    await session.fetch("https://some.resource");
    // @ts-expect-error We know headers is initialized.
    expect(headers.get("Authorization")).toBe(`DPoP ${mockedIdToken}`);
    // @ts-expect-error We know headers is initialized.
    expect(headers.get("dpop")).not.toBeNull();
    globalThis.fetch = globalFetch;
  });

  it("generates a random session ID if none provided", async () => {
    const mockedIdToken = await mockIdToken({});
    const tokenSet: SessionTokenSet = {
      idToken: mockedIdToken,
      clientId: mockClientId,
      issuer: mockIssuer,
      webId: mockWebid,
    };

    const session = await Session.fromTokens(tokenSet);

    expect(session.info.sessionId).toBeDefined();
    expect(typeof session.info.sessionId).toBe("string");
    expect(session.info.sessionId.length).toBeGreaterThan(0);
  });

  it("creates an unauthenticated session if tokens are expired", async () => {
    const mockedIdToken = await mockIdToken({});
    const tokenSet: SessionTokenSet = {
      idToken: mockedIdToken,
      clientId: mockClientId,
      issuer: mockIssuer,
      webId: mockWebid,
      // The expiration date is set in the past
      expiresAt: Date.now() - 3600,
    };

    const session = await Session.fromTokens(tokenSet);

    expect(session.info.isLoggedIn).toBe(false);
    // The session being logged out means no authentication
    // header will be added.
    const globalFetch = globalThis.fetch;
    let headers: Headers;
    globalThis.fetch = (async (input, init) => {
      // Capture the fetch headers.
      headers = new Headers(init?.headers);
      return new Response();
    }) as typeof fetch;
    await session.fetch("https://some.resource");
    // @ts-expect-error We know headers is initialized.
    expect(headers.get("Authorization")).toBeNull();
    globalThis.fetch = globalFetch;
  });

  it("creates an unauthenticated session if token verification fails", async () => {
    const tokenSet: SessionTokenSet = {
      idToken: "some invalid ID token",
      clientId: mockClientId,
      issuer: mockIssuer,
      webId: mockWebid,
    };

    const session = await Session.fromTokens(tokenSet);

    expect(session.info.isLoggedIn).toBe(false);
  });
});
