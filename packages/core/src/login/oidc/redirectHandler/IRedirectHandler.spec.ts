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

import { jest, it, describe, expect } from "@jest/globals";
import { JWTPayload, KeyLike, SignJWT, generateKeyPair, exportJWK } from "jose";
import { Response as NodeResponse } from "cross-fetch";
import type * as CrossFetch from "cross-fetch";
import { getWebidFromTokenPayload } from "./IRedirectHandler";

jest.mock("cross-fetch", () => {
  return {
    ...(jest.requireActual("cross-fetch") as typeof CrossFetch),
    default: jest.fn(),
    fetch: jest.fn(),
  } as typeof CrossFetch;
});

describe("getWebidFromTokenPayload", () => {
  // Singleton keys generated on the first call to mockJwk
  let publicKey: KeyLike | undefined;
  let privateKey: KeyLike | undefined;

  const mockJwk = async (): Promise<{
    publicKey: KeyLike;
    privateKey: KeyLike;
  }> => {
    if (typeof publicKey === "undefined" || typeof privateKey === "undefined") {
      const generatedPair = await generateKeyPair("ES256");
      publicKey = generatedPair.publicKey;
      privateKey = generatedPair.privateKey;
    }
    return {
      publicKey,
      privateKey,
    };
  };

  const mockJwks = async (): Promise<string> => {
    const { publicKey: issuerPubKey } = await mockJwk();
    const jwk = await exportJWK(issuerPubKey);
    // This is not set by 'exportJWK'
    jwk.alg = "ES256";
    return JSON.stringify({ keys: [jwk] });
  };

  const mockJwt = async (
    claims: JWTPayload,
    issuer: string,
    audience: string,
    signingKey?: KeyLike
  ): Promise<string> => {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("2h")
      .sign(signingKey ?? (await mockJwk()).privateKey);
  };

  const mockFetch = (payload: string, statusCode: number): void => {
    const { fetch: mockedFetch } = jest.requireMock(
      "cross-fetch"
    ) as jest.Mocked<typeof CrossFetch>;
    mockedFetch.mockResolvedValueOnce(
      new NodeResponse(payload, { status: statusCode })
    );
  };

  it("throws if the JWKS cannot be fetched", async () => {
    mockFetch("", 404);
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow(
      "Could not fetch JWKS for [https://some.issuer] at [https://some.jwks]: 404 Not Found"
    );
  });

  it("throws if the JWKS is malformed", async () => {
    // Invalid JSON.
    mockFetch("", 200);
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow(
      "Malformed JWKS for [https://some.issuer] at [https://some.jwks]:"
    );
  });

  it("throws if the ID token signature verification fails", async () => {
    mockFetch(await mockJwks(), 200);
    const { privateKey: anotherKey } = await generateKeyPair("ES256");
    // Sign the returned JWT with a private key unrelated to the public key in the JWKS
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId",
      anotherKey
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow(
      "ID token verification failed: JWSSignatureVerificationFailed: signature verification failed"
    );
  });

  it("throws if the ID token issuer verification fails", async () => {
    mockFetch(await mockJwks(), 200);
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.other.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow(
      'ID token verification failed: JWTClaimValidationFailed: unexpected "iss" claim value'
    );
  });

  it("throws if the ID token audience verification fails", async () => {
    mockFetch(await mockJwks(), 200);
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.other.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow(
      'ID token verification failed: JWTClaimValidationFailed: unexpected "aud" claim value'
    );
  });

  it("throws if the 'webid' and the 'sub' claims are missing", async () => {
    mockFetch(await mockJwks(), 200);
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow("it has no 'webid' claim and no 'sub' claim.");
  });

  it("throws if the 'webid' claims is missing and the 'sub' claim is not an IRI", async () => {
    mockFetch(await mockJwks(), 200);
    const jwt = await mockJwt(
      { sub: "some user ID" },
      "https://some.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).rejects.toThrow(
      "The ID token has no 'webid' claim, and its 'sub' claim of [some user ID] is invalid as a URL - error [TypeError: Invalid URL: some user ID]."
    );
  });

  it("returns the WebID it the 'webid' claim exists", async () => {
    mockFetch(await mockJwks(), 200);
    const jwt = await mockJwt(
      { webid: "https://some.webid#me" },
      "https://some.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).resolves.toBe("https://some.webid#me");
  });

  it("returns the WebID it the 'sub' claim exists and it is IRI-like", async () => {
    mockFetch(await mockJwks(), 200);
    const jwt = await mockJwt(
      { sub: "https://some.webid#me" },
      "https://some.issuer",
      "https://some.clientId"
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId"
      )
    ).resolves.toBe("https://some.webid#me");
  });
});
