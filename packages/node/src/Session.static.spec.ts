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

import { jest, it, describe, expect, beforeEach } from "@jest/globals";
import type { AuthorizationRequestState, SessionTokenSet } from "core";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { validate } from "uuid";
import type * as Jose from "jose";
import { Session } from "./Session";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// ---------------------------------------------------------------------------
// MIGRATION (Phase 4): Session's node login path now uses oauth4webapi for both
// discovery (`discoveryRequest`/`processDiscoveryResponse`) and the auth-code
// token exchange (`validateAuthResponse` → `authorizationCodeGrantRequest` →
// `processAuthorizationCodeResponse`). These mocks replace the openid-client
// `Issuer`/`Client.callback` mocks.
//
// NOTE (CI-validate): not executed in this branch (deps not installed). Tests
// that previously asserted the openid-client `client.callback(...)` argument
// list now assert against `authorizationCodeGrantRequest`'s positional args.
// ---------------------------------------------------------------------------
jest.mock("jose", () => {
  const actualJose = jest.requireActual("jose") as typeof Jose;
  return {
    ...actualJose,
    createRemoteJWKSet: jest.fn(),
  };
});

const mockOpConfig = (
  { scopesSupported }: { scopesSupported: string[] } = {
    scopesSupported: ["openid", "webid"],
  },
) => ({
  issuer: "https://my.idp/",
  authorization_endpoint: "https://my.idp/auth",
  token_endpoint: "https://my.idp/token",
  registration_endpoint: "https://my.idp/register",
  jwks_uri: "https://my.idp/jwks",
  claims_supported: ["sub"],
  scopes_supported: scopesSupported,
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["ES256", "RS256"],
  grant_types_supported: [
    "authorization_code",
    "refresh_token",
    "client_credentials",
  ],
  end_session_endpoint: "https://my.idp/endSessionEndpoint",
});

jest.mock("oauth4webapi", () => {
  const actual = jest.requireActual("oauth4webapi") as any;
  return {
    ...actual,
    discoveryRequest: jest.fn(() => Promise.resolve(new Response())),
    processDiscoveryResponse: jest.fn(),
    validateAuthResponse: jest.fn(),
    authorizationCodeGrantRequest: jest.fn(() =>
      Promise.resolve(new Response()),
    ),
    processAuthorizationCodeResponse: jest.fn(),
    DPoP: jest.fn(() => ({ __dpopHandle: true })),
    isDPoPNonceError: jest.fn(() => false),
  };
});

// eslint-disable-next-line import/first
import * as oauth from "oauth4webapi";

const mockOpDiscovery = (config?: Record<string, unknown>) => {
  // We only need the discovery to mock the OP configuration.
  (oauth.discoveryRequest as jest.Mock<any>).mockResolvedValue(new Response());
  (oauth.processDiscoveryResponse as jest.Mock<any>).mockResolvedValue(
    config ?? mockOpConfig(),
  );
};

const mockWebid = "https://example.com/profile#me";
const mockClientId = "client123";
const mockIdToken = async (payload: Jose.JWTPayload) => {
  const issuerKeyPair = await generateKeyPair("ES256");
  // Mock the issuer JWKS.
  const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
  mockJose.createRemoteJWKSet.mockReturnValue(
    (async () => issuerKeyPair.publicKey) as unknown as ReturnType<
      (typeof Jose)["createRemoteJWKSet"]
    >,
  );
  return new SignJWT({
    sub: "user123",
    webid: payload.webid ?? mockWebid,
    iss: mockOpConfig().issuer,
    aud: mockClientId,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .sign(issuerKeyPair.privateKey);
};

const mockOpClient = (params: { code: string; state: string }) => {
  // `validateAuthResponse` returns the (branded) callback params consumed by
  // `authorizationCodeGrantRequest`.
  (oauth.validateAuthResponse as jest.Mock<any>).mockReturnValue(
    new URLSearchParams(params),
  );
  // `processAuthorizationCodeResponse` yields the processed token set.
  const processMock = jest.fn().mockImplementation(
    async () =>
      ({
        access_token: "mock-access-token",
        id_token: await mockIdToken({}),
        token_type: "dpop",
        expires_in: 3600,
      }) as never,
  );
  (oauth.processAuthorizationCodeResponse as jest.Mock<any>).mockImplementation(
    processMock,
  );
  // Returned mock is the *grant request* fn, whose positional args the tests
  // assert against (redirect URI, code verifier, DPoP handle).
  return oauth.authorizationCodeGrantRequest as jest.Mock<any>;
};

const mockAuthRequestState = (
  {
    dpopBound,
    clientId,
  }: {
    dpopBound: boolean;
    clientId: string;
  } = {
    dpopBound: true,
    clientId: "https://rp.example.org/client-id",
  },
): AuthorizationRequestState => ({
  codeVerifier: "test-code-verifier",
  state: "test-state",
  issuer: mockOpConfig().issuer,
  redirectUrl: "https://rp.example.org/callback/",
  dpopBound,
  clientId,
});

describe("Session static functions", () => {
  describe("solid-oidc compliant OP", () => {
    beforeEach(() => {
      mockOpDiscovery();
    });

    describe("Session.fromTokens", () => {
      it("creates a session with the provided tokens", async () => {
        const mockedIdToken = await mockIdToken({});
        const tokenSet: SessionTokenSet = {
          accessToken: "access.token.jwt",
          idToken: mockedIdToken,
          clientId: mockClientId,
          issuer: mockOpConfig().issuer,
          // Expiration date is in the future.
          expiresAt: Date.now() / 1000 + 3600,
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
        const dpopKeyPair = await generateKeyPair("ES256", {
          extractable: true,
        });

        const dpopKey = {
          privateKey: dpopKeyPair.privateKey,
          publicKey: await exportJWK(dpopKeyPair.publicKey),
        };

        const mockedIdToken = await mockIdToken({});
        const tokenSet: SessionTokenSet = {
          accessToken: "access.token.jwt",
          idToken: mockedIdToken,
          clientId: mockClientId,
          issuer: mockOpConfig().issuer,
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
          issuer: mockOpConfig().issuer,
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
          issuer: mockOpConfig().issuer,
          webId: mockWebid,
          // The expiration date is set in the past
          expiresAt: Date.now() / 1000 - 3600,
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
          issuer: mockOpConfig().issuer,
          webId: mockWebid,
        };

        const session = await Session.fromTokens(tokenSet);

        expect(session.info.isLoggedIn).toBe(false);
      });
    });

    describe("Session.fromAuthorizationRequestState", () => {
      it("creates a session able to perform a token request", async () => {
        const authorizationRequestState = mockAuthRequestState();
        const sessionId = "test-session-id";

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
          sessionId,
        );

        expect(session.info.sessionId).toBe(sessionId);
        expect(session.info.isLoggedIn).toBe(false);

        const redirectUrl = new URL("https://example.org/callback/");
        redirectUrl.searchParams.append("code", "some-authorization-code");
        redirectUrl.searchParams.append("state", "test-state");

        // This tests for implementation rather than behavior, but it is simpler
        // this way and can be improved when migrating to openid-client v6, where
        // only network interaction can be mocked.
        const mockedGrant = mockOpClient({
          code: "some-authorization-code",
          state: "test-state",
        });

        await session.handleIncomingRedirect(redirectUrl.href);

        expect(mockedGrant).toHaveBeenCalled();
        // MIGRATION (Phase 4): oauth4webapi `authorizationCodeGrantRequest`
        // positional args: (as, client, clientAuth, params, redirectUri,
        // codeVerifier, { DPoP }).
        const [, , , , requestRedirectUrl, verifier, dpop] =
          mockedGrant.mock.calls[0];
        expect(requestRedirectUrl).toBe(
          new URL(redirectUrl.pathname, redirectUrl.origin).href,
        );
        // The stored PKCE code verifier is threaded through.
        expect(verifier).toBe("test-code-verifier");
        // A DPoP handle is provided for the dpop-bound session.
        expect(dpop).toStrictEqual(
          expect.objectContaining({ DPoP: expect.anything() }),
        );
      });

      it("can create a non-dpop-bound session", async () => {
        const authorizationRequestState = mockAuthRequestState({
          dpopBound: false,
          clientId: "https://rp.example.org/client-id",
        });
        const sessionId = "test-session-id";

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
          sessionId,
        );

        const redirectUrl = new URL("https://example.org/callback/");
        redirectUrl.searchParams.append("code", "some-authorization-code");
        redirectUrl.searchParams.append("state", "test-state");

        const mockedGrant = mockOpClient({
          code: "some-authorization-code",
          state: "test-state",
        });

        await session.handleIncomingRedirect(redirectUrl.href);
        // Only the dpop parameter is relevant to this test.

        // MIGRATION (Phase 4): for a non-dpop session, no DPoP handle is passed
        // (the 7th positional arg is an empty options object).
        const dpop = mockedGrant.mock.calls[0][6];
        expect(dpop).toStrictEqual({});
      });

      it("generates a UUID as sessionId if not provided", async () => {
        const authorizationRequestState = mockAuthRequestState();

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
        );

        expect(validate(session.info.sessionId)).toBe(true);
      });

      it("validates the client ID", async () => {
        const authorizationRequestState = mockAuthRequestState({
          dpopBound: true,
          clientId: "Some invalid client id",
        });
        await expect(
          Session.fromAuthorizationRequestState(authorizationRequestState),
        ).rejects.toThrow();
      });
    });
  });

  describe("Session.fromAuthorizationRequestState with invalid OP", () => {
    it("validates the OP config", async () => {
      // Mock a non-Solid-OIDC compliant OP.
      mockOpDiscovery(mockOpConfig({ scopesSupported: ["openid"] }));
      const authorizationRequestState = mockAuthRequestState();
      await expect(
        Session.fromAuthorizationRequestState(authorizationRequestState),
      ).rejects.toThrow();
    });
  });
});
