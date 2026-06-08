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

import { it, describe, expect } from "@jest/globals";
import type { CryptoKey } from "jose";
import { generateKeyPair, exportJWK, jwtVerify, base64url } from "jose";
import { createDpopHeader, generateDpopKeyPair } from "./dpopUtils";

let publicKey: CryptoKey | undefined;
let privateKey: CryptoKey | undefined;

const mockJwk = async (): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
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

const mockKeyPair = async () => {
  const { privateKey: prvt, publicKey: pblc } = await mockJwk();
  const dpopKeyPair = {
    privateKey: prvt,
    publicKey: await exportJWK(pblc),
  };
  // The alg property isn't set by exportJWK, so set it manually.
  dpopKeyPair.publicKey.alg = "ES256";
  return dpopKeyPair;
};

describe("createDpopHeader", () => {
  it("creates a JWT with 'htm', 'htu' and 'jti' claims in the payload", async () => {
    const header = await createDpopHeader(
      "https://some.resource",
      "GET",
      await mockKeyPair(),
    );
    const { payload } = await jwtVerify(header, (await mockJwk()).publicKey);
    expect(payload.htm).toBe("GET");
    expect(payload.jti).toBeDefined();
    // The IRI is normalized, hence the trailing '/'
    expect(payload.htu).toBe("https://some.resource/");
  });

  it("creates a JWT with 'htu' that needs to be normalized", async () => {
    const header = await createDpopHeader(
      "https://user:pass@some.resource/?query#hash",
      "GET",
      await mockKeyPair(),
    );
    const { payload } = await jwtVerify(header, (await mockJwk()).publicKey);
    expect(payload.htm).toBe("GET");
    expect(payload.jti).toBeDefined();
    // The IRI is normalized, hence the trailing '/'
    expect(payload.htu).toBe("https://some.resource/");
  });

  it("creates a JWT with the appropriate protected header", async () => {
    const header = await createDpopHeader(
      "https://some.resource",
      "GET",
      await mockKeyPair(),
    );
    const { protectedHeader } = await jwtVerify(
      header,
      (await mockJwk()).publicKey,
    );
    expect(protectedHeader.alg).toBe("ES256");
    expect(protectedHeader.typ).toBe("dpop+jwt");
    // The embedded JWK is now produced by the `dpop` package. It exports the
    // canonical *public* members (`kty`, `crv`, `x`, `y` for EC) rather than the
    // exact object inrupt previously passed through, so assert on the
    // confirmation-relevant members rather than strict object equality.
    const expectedJwk = (await mockKeyPair()).publicKey;
    expect(protectedHeader.jwk).toMatchObject({
      kty: expectedJwk.kty,
      crv: expectedJwk.crv,
      x: expectedJwk.x,
      y: expectedJwk.y,
    });
  });

  // POC: replaces the manual `ath` computation that PR #4292 added by hand.
  // With the `dpop` package, `ath` is derived from the access token inside the
  // library, so we just assert the spec-defined value is present and correct.
  it("binds the proof to the access token via the RFC 9449 'ath' claim when provided", async () => {
    const accessToken = "some.access.token";
    const header = await createDpopHeader(
      "https://some.resource",
      "GET",
      await mockKeyPair(),
      accessToken,
    );
    const { payload } = await jwtVerify(header, (await mockJwk()).publicKey);
    // RFC 9449 §4.2: ath = base64url(SHA-256(ASCII(access token))).
    const expectedAth = base64url.encode(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(accessToken),
        ),
      ),
    );
    expect(payload.ath).toBe(expectedAth);
  });

  it("omits the 'ath' claim when no access token is provided (back-compatible)", async () => {
    const header = await createDpopHeader(
      "https://some.resource",
      "GET",
      await mockKeyPair(),
    );
    const { payload } = await jwtVerify(header, (await mockJwk()).publicKey);
    expect(payload.ath).toBeUndefined();
  });
});

describe("generateDpopKeyPair", () => {
  it("generates a public, private key pair", async () => {
    const keyPair = await generateDpopKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.alg).toBe("ES256");
  });
});
