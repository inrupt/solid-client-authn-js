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

import {
  jest,
  it,
  describe,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import type { AuthorizationRequestState, SessionTokenSet } from "core";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { validate } from "uuid";
import type * as Jose from "jose";
import { Session } from "./Session";
import { randomUUID } from "crypto";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

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
    aud: payload.aud ?? mockClientId,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .sign(issuerKeyPair.privateKey);
};

const mockJsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Mocks the network interactions with the OpenID Provider: the discovery
 * document, and the token endpoint. The token endpoint returns an ID token
 * issued for the provided client ID.
 */
const mockOpEndpoints = async ({
  opConfig,
  clientId,
}: {
  opConfig?: ReturnType<typeof mockOpConfig>;
  clientId?: string;
} = {}) => {
  const config = opConfig ?? mockOpConfig();
  const idToken = await mockIdToken({ aud: clientId ?? mockClientId });
  const tokenRequests: Request[] = [];
  const fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      if (
        request.url ===
        new URL(".well-known/openid-configuration", config.issuer).href
      ) {
        return mockJsonResponse(config);
      }
      if (request.url === config.token_endpoint) {
        tokenRequests.push(request);
        return mockJsonResponse({
          access_token: "mock-access-token",
          id_token: idToken,
          token_type: request.headers.has("DPoP") ? "DPoP" : "Bearer",
          expires_in: 3600,
        });
      }
      return new Response(null, { status: 404 });
    });
  return { fetchSpy, tokenRequests };
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
    beforeEach(async () => {
      await mockOpEndpoints();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe("Session.fromTokens", () => {
      it("creates a session with the provided tokens", async () => {
        const mockedAccessToken = randomUUID();
        const mockedIdToken = await mockIdToken({});
        const tokenSet: SessionTokenSet = {
          accessToken: mockedAccessToken,
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
        expect(headers.get("Authorization")).toBe(
          `Bearer ${mockedAccessToken}`,
        );
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

        const mockedAccessToken = randomUUID();
        const mockedIdToken = await mockIdToken({});
        const tokenSet: SessionTokenSet = {
          accessToken: mockedAccessToken,
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
        expect(headers.get("Authorization")).toBe(`DPoP ${mockedAccessToken}`);
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
      const mockRedirectUrl = () => {
        const redirectUrl = new URL("https://example.org/callback/");
        redirectUrl.searchParams.append("code", "some-authorization-code");
        redirectUrl.searchParams.append("state", "test-state");
        return redirectUrl;
      };

      it("creates a session able to perform a token request for solid-oidc clients", async () => {
        const authorizationRequestState = mockAuthRequestState();
        const sessionId = "test-session-id";
        const { tokenRequests } = await mockOpEndpoints({
          clientId: authorizationRequestState.clientId,
        });

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
          sessionId,
        );

        expect(session.info.sessionId).toBe(sessionId);
        expect(session.info.isLoggedIn).toBe(false);

        const redirectUrl = mockRedirectUrl();
        await session.handleIncomingRedirect(redirectUrl.href);

        expect(session.info.isLoggedIn).toBe(true);
        expect(session.info.webId).toBe(mockWebid);

        expect(tokenRequests).toHaveLength(1);
        const [tokenRequest] = tokenRequests;
        expect(tokenRequest.method).toBe("POST");
        const body = new URLSearchParams(await tokenRequest.text());
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("code")).toBe("some-authorization-code");
        expect(body.get("code_verifier")).toBe("test-code-verifier");
        // The redirect URL is sent without its query parameters.
        expect(body.get("redirect_uri")).toBe(
          new URL(redirectUrl.pathname, redirectUrl.origin).href,
        );
        // Solid-OIDC clients do not authenticate to the token endpoint.
        expect(body.get("client_id")).toBe(authorizationRequestState.clientId);
        expect(tokenRequest.headers.get("Authorization")).toBeNull();
        // The token request is DPoP-bound.
        expect(tokenRequest.headers.get("DPoP")).not.toBeNull();
      });

      it("creates a session able to perform a token request for statically registered clients", async () => {
        const authorizationRequestState = mockAuthRequestState({
          dpopBound: true,
          clientId: "some-client-id",
        });
        const sessionId = "test-session-id";
        const { tokenRequests } = await mockOpEndpoints({
          clientId: authorizationRequestState.clientId,
        });

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
          sessionId,
          "some-client-secret",
        );

        expect(session.info.sessionId).toBe(sessionId);
        expect(session.info.isLoggedIn).toBe(false);

        const redirectUrl = mockRedirectUrl();
        await session.handleIncomingRedirect(redirectUrl.href);

        expect(session.info.isLoggedIn).toBe(true);
        expect(session.info.webId).toBe(mockWebid);

        expect(tokenRequests).toHaveLength(1);
        const [tokenRequest] = tokenRequests;
        const body = new URLSearchParams(await tokenRequest.text());
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("code")).toBe("some-authorization-code");
        expect(body.get("code_verifier")).toBe("test-code-verifier");
        expect(body.get("redirect_uri")).toBe(
          new URL(redirectUrl.pathname, redirectUrl.origin).href,
        );
        expect(tokenRequest.headers.get("DPoP")).not.toBeNull();

        // Check the appropriate client auth method is used (client_secret_basic).
        expect(body.get("client_secret")).toBeNull();
        const authorization = tokenRequest.headers.get("Authorization");
        expect(authorization).toMatch(/^Basic /);
        // The client ID and secret are form-urlencoded prior to being base64-encoded.
        const credentials = atob((authorization as string).slice(6))
          .split(":")
          .map(decodeURIComponent);
        expect(credentials).toStrictEqual([
          "some-client-id",
          "some-client-secret",
        ]);
      });

      it("can create a non-dpop-bound session", async () => {
        const authorizationRequestState = mockAuthRequestState({
          dpopBound: false,
          clientId: "https://rp.example.org/client-id",
        });
        const sessionId = "test-session-id";
        const { tokenRequests } = await mockOpEndpoints({
          clientId: authorizationRequestState.clientId,
        });

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
          sessionId,
        );

        await session.handleIncomingRedirect(mockRedirectUrl().href);

        expect(session.info.isLoggedIn).toBe(true);
        // Only the DPoP header is relevant to this test.
        expect(tokenRequests).toHaveLength(1);
        expect(tokenRequests[0].headers.get("DPoP")).toBeNull();
      });

      it("generates a UUID as sessionId if not provided", async () => {
        const authorizationRequestState = mockAuthRequestState();

        const session = await Session.fromAuthorizationRequestState(
          authorizationRequestState,
        );

        expect(validate(session.info.sessionId)).toBe(true);
      });

      it("rejects non-URL client IDs in the absence of a client secret", async () => {
        const authorizationRequestState = mockAuthRequestState({
          dpopBound: true,
          clientId: "Some non-URL client id",
        });
        await expect(
          Session.fromAuthorizationRequestState(authorizationRequestState),
        ).rejects.toThrow();
      });
    });
  });

  describe("Session.fromAuthorizationRequestState with invalid OP", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("validates the OP config", async () => {
      // Mock a non-Solid-OIDC compliant OP.
      await mockOpEndpoints({
        opConfig: mockOpConfig({ scopesSupported: ["openid"] }),
      });
      const authorizationRequestState = mockAuthRequestState();
      await expect(
        Session.fromAuthorizationRequestState(authorizationRequestState),
      ).rejects.toThrow("does not support Solid-OIDC");
    });
  });
});
