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
import type * as Jose from "jose";
import { SignJWT, generateKeyPair } from "jose";
import { getWebidFromTokenPayload } from "./token";

jest.mock("jose", () => {
  const actualJose = jest.requireActual("jose") as typeof Jose;
  return {
    ...actualJose,
    createRemoteJWKSet: jest.fn(),
  };
});

describe("getWebidFromTokenPayload", () => {
  // Singleton keys generated on the first call to mockJwk
  let publicKey: Jose.KeyLike | undefined;
  let privateKey: Jose.KeyLike | undefined;

  const mockJwk = async (): Promise<{
    publicKey: Jose.KeyLike;
    privateKey: Jose.KeyLike;
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

  const mockJwt = async (
    claims: Jose.JWTPayload,
    issuer: string,
    audience: string,
    signingKey?: Jose.KeyLike,
  ): Promise<string> => {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("2h")
      .sign(signingKey ?? (await mockJwk()).privateKey);
  };

  it("throws if the JWKS retrieval fails", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockRejectedValue("Maformed JWKS"),
    );
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId",
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).rejects.toThrow("Token verification failed");
  });

  it("throws if the ID token signature verification fails", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const { privateKey: anotherKey } = await generateKeyPair("ES256");
    // Sign the returned JWT with a private key unrelated to the public key in the JWKS
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId",
      anotherKey,
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).rejects.toThrow(
      "Token verification failed: JWSSignatureVerificationFailed: signature verification failed",
    );
  });

  it("throws if the ID token issuer verification fails", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.other.issuer",
      "https://some.clientId",
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).rejects.toThrow(
      'Token verification failed: JWTClaimValidationFailed: unexpected "iss" claim value',
    );
  });

  it("throws if the ID token audience verification fails", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.other.clientId",
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).rejects.toThrow(
      'Token verification failed: JWTClaimValidationFailed: unexpected "aud" claim value',
    );
  });

  it("throws if the 'webid' and the 'sub' claims are missing", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const jwt = await mockJwt(
      { someClaim: true },
      "https://some.issuer",
      "https://some.clientId",
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).rejects.toThrow("it has no 'webid' claim and no 'sub' claim.");
  });

  it("throws if the 'webid' claims is missing and the 'sub' claim is not an IRI", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const jwt = await mockJwt(
      { sub: "some user ID" },
      "https://some.issuer",
      "https://some.clientId",
    );

    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).rejects.toThrow(
      "The token has no 'webid' claim, and its 'sub' claim of [some user ID] is invalid as a URL - error",
    );
  });

  it("returns the WebID it the 'webid' claim exists", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const jwt = await mockJwt(
      { webid: "https://some.webid#me" },
      "https://some.issuer",
      "https://some.clientId",
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).resolves.toBe("https://some.webid#me");
  });

  it("returns the WebID it the 'sub' claim exists and it is IRI-like", async () => {
    const mockJose = jest.requireMock("jose") as jest.Mocked<typeof Jose>;
    mockJose.createRemoteJWKSet.mockReturnValue(
      jest
        .fn<ReturnType<(typeof Jose)["createRemoteJWKSet"]>>()
        .mockResolvedValue((await mockJwk()).publicKey),
    );
    const jwt = await mockJwt(
      { sub: "https://some.webid#me" },
      "https://some.issuer",
      "https://some.clientId",
    );
    await expect(
      getWebidFromTokenPayload(
        jwt,
        "https://some.jwks",
        "https://some.issuer",
        "https://some.clientId",
      ),
    ).resolves.toBe("https://some.webid#me");
  });
});
