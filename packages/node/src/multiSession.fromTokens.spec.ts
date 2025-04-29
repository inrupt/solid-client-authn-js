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

import { jest, it, describe, expect, beforeEach } from "@jest/globals";
import type { IIssuerConfig, SessionTokenSet } from "core";
import * as Jose from "jose";
import { refreshTokens, logout } from "./multisession.fromTokens";
import { Session, issuerConfigFetcher } from "./Session";

jest.mock("jose", () => {
  const actualJose = jest.requireActual("jose") as typeof Jose;
  return {
    ...actualJose,
    createRemoteJWKSet: jest.fn(),
    // jwtVerify: jest.fn(),
  };
});

describe("refreshTokens", () => {
  it("returns refreshed tokens when refresh is successful", async () => {
    const newTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      idToken: "new-id-token",
      clientId: "client-id",
      issuer: "https://my.idp",
      webId: "https://my.webid",
      expiresAt: Date.now() / 1000 + 3600,
    };
    // Mock Session.fromTokens static method
    const mockSession = {
      info: {
        isLoggedIn: true,
        sessionId: "test-session-id",
        webId: "https://my.webid",
      },
      login: jest.fn<Session["login"]>().mockResolvedValue(),
      events: {
        on: jest
          .fn<
            (
              event: "newTokens",
              callback: (tokens: SessionTokenSet) => void,
            ) => void
          >()
          .mockImplementation((_, callback) => {
            // Simulate token refresh by calling the callback with new tokens
            callback(newTokens);
          }),
      },
    };

    // Mock the static method
    const originalFromTokens = Session.fromTokens;
    Session.fromTokens = jest
      .fn<typeof Session.fromTokens>()
      .mockResolvedValue(mockSession as unknown as Session);
    const tokenSet = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    const refreshedTokens = await refreshTokens(tokenSet);

    // Verify we got the refreshed tokens
    expect(refreshedTokens).toEqual(newTokens);
    // Restore the original method
    Session.fromTokens = originalFromTokens;
  });

  it("throws an error when refresh fails", async () => {
    // Mock Session.fromTokens static method with a session that fails to log in
    const mockSession = {
      info: {
        isLoggedIn: false, // Session failed to log in
        sessionId: "test-session-id",
      },
      login: jest.fn<Session["login"]>().mockResolvedValue(),
      events: {
        on: jest.fn(),
      },
    };

    // Mock the static method
    const originalFromTokens = Session.fromTokens;
    Session.fromTokens = jest
      .fn<typeof Session.fromTokens>()
      .mockResolvedValue(mockSession as unknown as Session);

    const tokenSet = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    // The function should reject with an error
    await expect(refreshTokens(tokenSet)).rejects.toThrow(
      "Could not refresh the session.",
    );

    // Restore the original method
    Session.fromTokens = originalFromTokens;
  });
});

describe("logout", () => {
  const mockIssuer = (endSessionEndpoint?: string): IIssuerConfig => {
    return {
      issuer: "https://some.issuer",
      authorizationEndpoint: "https://some.issuer/autorization",
      tokenEndpoint: "https://some.issuer/token",
      jwksUri: "https://some.issuer/keys",
      claimsSupported: ["code", "openid"],
      subjectTypesSupported: ["public"],
      registrationEndpoint: "https://some.issuer/registration",
      grantTypesSupported: ["authorization_code"],
      scopesSupported: ["openid"],
      endSessionEndpoint,
    };
  };

  // Singleton keys generated for tests
  let mockPublicKey: Jose.KeyLike;
  let mockPrivateKey: Jose.KeyLike;

  // Generate a valid ID token
  const createMockIdToken = async (
    issuer: string,
    audience: string,
    useValidKey = true,
  ): Promise<string> => {
    const signingKey = useValidKey
      ? mockPrivateKey
      : (await Jose.generateKeyPair("ES256")).privateKey;

    return new Jose.SignJWT({ sub: "test-user" })
      .setProtectedHeader({ alg: "ES256" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("2h")
      .sign(signingKey);
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Generate keys for each test
    if (!mockPublicKey || !mockPrivateKey) {
      const keyPair = await Jose.generateKeyPair("ES256");
      mockPublicKey = keyPair.publicKey;
      mockPrivateKey = keyPair.privateKey;
    }

    // Setup the mocked jwtVerify to succeed by default
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    // mockJose.jwtVerify.mockImplementation(async (jwt, _keySource, options) => {
    //   // Default successful verification
    //   return {
    //     payload: {
    //       iss: options?.issuer,
    //       sub: "test-user",
    //       aud: "client-id",
    //       exp: Math.floor(Date.now() / 1000) + 3600,
    //       iat: Math.floor(Date.now() / 1000),
    //     },
    //     protectedHeader: { alg: "ES256" },
    //   };
    // });

    // Setup createRemoteJWKSet to return a key lookup function
    mockJose.createRemoteJWKSet.mockReturnValue(async () => mockPublicKey);
  });

  it("throws an error if idToken is not provided", async () => {
    const tokenSet: SessionTokenSet = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
      // No ID token provided
    };

    const redirectHandler = jest.fn();
    await expect(logout(tokenSet, redirectHandler)).rejects.toThrow(
      "Logging out of the Identity Provider requires a valid ID token.",
    );
    expect(redirectHandler).not.toHaveBeenCalled();
  });

  it("fetches config from the issuer and verifies the token", async () => {
    // Mock the issuerConfigFetcher with an end_session_endpoint
    const mockFetchConfig = jest.spyOn(issuerConfigFetcher, "fetchConfig");
    mockFetchConfig.mockResolvedValue(mockIssuer("https://my.idp/logout"));

    // Create a valid ID token
    const idToken = await createMockIdToken("https://my.idp", "client-id");

    // Setup token set with ID token
    const tokenSet: SessionTokenSet = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken,
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    const redirectHandler = jest.fn<(url: string) => void>();

    await logout(tokenSet, redirectHandler);

    expect(redirectHandler).toHaveBeenCalledTimes(1);
    const [redirectHandlerCall] = redirectHandler.mock.calls;
    const logoutUrl = new URL(redirectHandlerCall[0]);
    expect(logoutUrl.searchParams.get("id_token_hint")).toBe(idToken);
    expect(logoutUrl.host).toBe("my.idp");
    expect(logoutUrl.pathname).toBe("/logout");
  });

  it("throws an error if token verification fails", async () => {
    // Mock the issuerConfigFetcher with an end_session_endpoint
    const mockFetchConfig = jest.spyOn(issuerConfigFetcher, "fetchConfig");
    mockFetchConfig.mockResolvedValue(mockIssuer("https://my.idp/logout"));

    // Create an ID token with wrong key - will cause verification failure
    const idToken = await createMockIdToken(
      "https://my.idp",
      "client-id",
      false,
    );

    // Setup token set with invalid ID token
    const tokenSet: SessionTokenSet = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken,
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    const redirectHandler = jest.fn();
    await expect(logout(tokenSet, redirectHandler)).rejects.toThrow();
    expect(redirectHandler).not.toHaveBeenCalled();
  });

  it("throws an error if the identity provider does not support RP-initiated logout", async () => {
    // Mock the issuerConfigFetcher _without_ an end_session_endpoint, causing a failure.
    const mockFetchConfig = jest.spyOn(issuerConfigFetcher, "fetchConfig");
    mockFetchConfig.mockResolvedValue(mockIssuer("https://my.idp/logout"));

    // Create a valid ID token
    const idToken = await createMockIdToken("https://my.idp", "client-id");

    // Setup token set with ID token
    const tokenSet: SessionTokenSet = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken,
      clientId: "client-id",
      issuer: "https://my.idp",
    };
    const redirectHandler = jest.fn();
    await expect(logout(tokenSet, redirectHandler)).rejects.toThrow(
      "The Identity Provider does not support RP-initiated logout.",
    );
    expect(redirectHandler).not.toHaveBeenCalled();
  });

  it("constructs correct logout URL with post_logout_redirect_uri if provided", async () => {
    // Mock the issuerConfigFetcher with an end_session_endpoint
    const mockFetchConfig = jest.spyOn(issuerConfigFetcher, "fetchConfig");
    mockFetchConfig.mockResolvedValue(mockIssuer("https://my.idp/logout"));

    // Create a valid ID token
    const idToken = await createMockIdToken("https://my.idp", "client-id");

    // Setup token set with ID token
    const tokenSet: SessionTokenSet = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken,
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    const redirectHandler = jest.fn<(url: string) => void>();

    // Provide post logout URL
    const postLogoutUrl = "https://my-app.com/logged-out";

    await logout(tokenSet, redirectHandler, postLogoutUrl);

    expect(redirectHandler).toHaveBeenCalledTimes(1);
    const [redirectHandlerCall] = redirectHandler.mock.calls;
    const logoutUrl = new URL(redirectHandlerCall[0]);
    expect(logoutUrl.searchParams.get("post_logout_redirect_uri")).toBe(
      postLogoutUrl,
    );
  });
});
