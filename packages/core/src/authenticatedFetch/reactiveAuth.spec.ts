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

// Camelcase identifiers are aligned with the OAuth specification.
/* eslint-disable camelcase */

import { jest, it, describe, expect, afterEach } from "@jest/globals";
import { jwtVerify, generateKeyPair, exportJWK } from "jose";
import { createHash } from "node:crypto";
import {
  parseAuthnChallenge,
  isResourceMetadata,
  hasAuthServer,
  setAsMetaDefaults,
  isASMetadata,
  exchange,
} from "./reactiveAuth";

const TOKEN_ENDPOINT = "https://as.example/access/token";
const AUDIENCE = "https://as.example";
const RESOURCE = "https://rs.example";
const SUBJECT_TOKEN = "some.subject.token";

// Computed independently of the implementation under test.
const expectedAth = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

const mockKeyPair = async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256", {
    extractable: true,
  });
  const jwk = await exportJWK(publicKey);
  // The alg property isn't set by exportJWK, so set it manually.
  jwk.alg = "ES256";
  return {
    verificationKey: publicKey,
    keyPair: { privateKey, publicKey: jwk },
  };
};

const validAsMetadata = () => ({
  issuer: AUDIENCE,
  token_endpoint: TOKEN_ENDPOINT,
  response_types_supported: [],
  grant_types_supported: [
    "client_credentials",
    "urn:ietf:params:oauth:grant-type:token-exchange",
  ],
  token_endpoint_auth_methods_supported: ["private_key_jwt", "none"],
  scopes_supported: ["some:scope"],
  client_id_metadata_document_supported: true,
});

const validTokenResponse = () => ({
  access_token: "some.exchanged.token",
  token_type: "Bearer",
  issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
  expires_in: 300,
});

const mockTokenEndpoint = (response: Response) =>
  jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);

describe("parseAuthnChallenge", () => {
  const RM = "https://rs.example/.well-known/oauth-protected-resource";

  describe("a single challenge", () => {
    it.each(["Bearer", "DPoP", "UMA"] as const)(
      "parses a %s challenge and its parameters",
      (scheme) => {
        expect(
          parseAuthnChallenge(`${scheme} resource_metadata="${RM}"`),
        ).toStrictEqual({ [scheme]: { resource_metadata: RM } });
      },
    );

    it("matches the scheme case-insensitively, and returns its canonical name", () => {
      expect(parseAuthnChallenge('bearer realm="some realm"')).toStrictEqual({
        Bearer: { realm: "some realm" },
      });
    });

    it("parses parameters separated by a comma", () => {
      expect(
        parseAuthnChallenge(
          `Bearer realm="some realm",resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        Bearer: { realm: "some realm", resource_metadata: RM },
      });
    });

    it("parses parameters separated by a comma and whitespace", () => {
      expect(
        parseAuthnChallenge(
          `Bearer realm="some realm",  resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        Bearer: { realm: "some realm", resource_metadata: RM },
      });
    });

    it("keeps '=' characters in parameter values", () => {
      expect(
        parseAuthnChallenge(`Bearer resource_metadata="${RM}?tenant=a"`),
      ).toStrictEqual({
        Bearer: { resource_metadata: `${RM}?tenant=a` },
      });
    });

    it("keeps commas in quoted parameter values", () => {
      expect(
        parseAuthnChallenge(
          `Bearer error_description="expired, or revoked", resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        Bearer: {
          error_description: "expired, or revoked",
          resource_metadata: RM,
        },
      });
    });
  });

  describe("several challenges", () => {
    it("parses Bearer and DPoP challenges, each with its own parameters", () => {
      expect(
        parseAuthnChallenge(
          `DPoP algs="ES256 RS256", Bearer resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        DPoP: { algs: "ES256 RS256" },
        Bearer: { resource_metadata: RM },
      });
    });

    it("parses challenges regardless of their order", () => {
      expect(
        parseAuthnChallenge(
          `Bearer resource_metadata="${RM}", DPoP algs="ES256 RS256"`,
        ),
      ).toStrictEqual({
        Bearer: { resource_metadata: RM },
        DPoP: { algs: "ES256 RS256" },
      });
    });

    it("parses challenges with several parameters each", () => {
      expect(
        parseAuthnChallenge(
          `DPoP realm="dpop realm", algs="ES256", Bearer realm="bearer realm", resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        DPoP: { realm: "dpop realm", algs: "ES256" },
        Bearer: { realm: "bearer realm", resource_metadata: RM },
      });
    });

    it("parses challenges separated by a comma without whitespace", () => {
      expect(
        parseAuthnChallenge(
          `DPoP algs="ES256",Bearer resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        DPoP: { algs: "ES256" },
        Bearer: { resource_metadata: RM },
      });
    });

    it("parses a challenge without parameters following another one", () => {
      // This is the challenge sent by the ESS Solid JWT authentication mechanism.
      const challenges = parseAuthnChallenge('DPoP algs="ES256 RS256",Bearer');
      expect(challenges.DPoP).toStrictEqual({ algs: "ES256 RS256" });
      expect(challenges.Bearer ?? {}).toStrictEqual({});
    });

    it("parses a challenge without parameters preceding another one", () => {
      const challenges = parseAuthnChallenge(
        `DPoP, Bearer resource_metadata="${RM}"`,
      );
      expect(challenges.DPoP ?? {}).toStrictEqual({});
      expect(challenges.Bearer).toStrictEqual({ resource_metadata: RM });
    });
  });

  describe("unsupported schemes", () => {
    it("returns no challenge for an unsupported scheme", () => {
      expect(parseAuthnChallenge('Basic realm="some realm"')).toStrictEqual({});
    });

    it("ignores an unsupported challenge preceding a supported one", () => {
      expect(
        parseAuthnChallenge(
          `Basic realm="some realm", Bearer resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({ Bearer: { resource_metadata: RM } });
    });

    it("does not attach the parameters of a following unsupported challenge", () => {
      expect(
        parseAuthnChallenge(
          `Bearer resource_metadata="${RM}", Basic realm="some realm", charset="UTF-8"`,
        ),
      ).toStrictEqual({ Bearer: { resource_metadata: RM } });
    });

    it("does not match a supported scheme name within another scheme name", () => {
      expect(parseAuthnChallenge('XBearer realm="some realm"')).toStrictEqual(
        {},
      );
    });
  });

  describe("scheme names in parameters", () => {
    it("does not mistake a scheme name in a parameter value for a challenge", () => {
      expect(
        parseAuthnChallenge(
          `DPoP realm="bearer realm", Bearer resource_metadata="${RM}"`,
        ),
      ).toStrictEqual({
        DPoP: { realm: "bearer realm" },
        Bearer: { resource_metadata: RM },
      });
    });

    it("does not mistake a scheme name in a URL for a challenge", () => {
      const umaRm = "https://uma.example/.well-known/oauth-protected-resource";
      expect(
        parseAuthnChallenge(`Bearer resource_metadata="${umaRm}"`),
      ).toStrictEqual({ Bearer: { resource_metadata: umaRm } });
    });
  });

  describe("malformed headers", () => {
    it("returns no challenge for an empty header", () => {
      expect(parseAuthnChallenge("")).toStrictEqual({});
    });

    it.each([
      ["a parameter without a value", "Bearer realm"],
      ["a trailing comma", `Bearer resource_metadata="${RM}",`],
      ["an empty parameter", `Bearer realm="a",,resource_metadata="${RM}"`],
      ["an unquoted value", "Bearer realm=some-realm"],
    ])("does not throw on %s", (_, header) => {
      expect(() => parseAuthnChallenge(header)).not.toThrow();
    });

    it("parses unquoted (token) parameter values", () => {
      expect(parseAuthnChallenge("Bearer error=invalid_token")).toStrictEqual({
        Bearer: { error: "invalid_token" },
      });
    });
  });
});

describe("isResourceMetadata", () => {
  it("accepts an object with a resource", () => {
    expect(isResourceMetadata({ resource: RESOURCE })).toBe(true);
  });

  it.each([[null], [undefined], ["some string"], [{}]])(
    "rejects %p",
    (value) => {
      expect(isResourceMetadata(value)).toBe(false);
    },
  );
});

describe("hasAuthServer", () => {
  it("accepts an array of authorization server URLs", () => {
    expect(
      hasAuthServer({ resource: RESOURCE, authorization_servers: [AUDIENCE] }),
    ).toBe(true);
  });

  it("rejects missing authorization servers", () => {
    expect(hasAuthServer({ resource: RESOURCE })).toBe(false);
  });

  it("rejects authorization servers which are not an array", () => {
    expect(
      hasAuthServer({
        resource: RESOURCE,
        authorization_servers: AUDIENCE as unknown as string[],
      }),
    ).toBe(false);
  });

  it("rejects authorization servers which are not all strings", () => {
    expect(
      hasAuthServer({
        resource: RESOURCE,
        authorization_servers: [AUDIENCE, 42] as unknown as string[],
      }),
    ).toBe(false);
  });
});

describe("setAsMetaDefaults", () => {
  it("fills in the RFC 8414 defaults for omitted fields", () => {
    expect(setAsMetaDefaults({ issuer: AUDIENCE })).toStrictEqual({
      issuer: AUDIENCE,
      grant_types_supported: ["authorization_code", "implicit"],
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
      client_id_metadata_document_supported: false,
    });
  });

  it("keeps explicitly provided values, even invalid ones", () => {
    expect(
      setAsMetaDefaults({ grant_types_supported: "not an array" }),
    ).toMatchObject({ grant_types_supported: "not an array" });
  });
});

describe("isASMetadata", () => {
  it("accepts valid authorization server metadata", () => {
    expect(isASMetadata(validAsMetadata())).toBe(true);
  });

  it("accepts metadata relying on the default values", () => {
    const { grant_types_supported: _omitted, ...withoutGrants } =
      validAsMetadata();
    expect(isASMetadata(setAsMetaDefaults(withoutGrants))).toBe(true);
  });

  it.each([[null], ["some string"], [42]])("rejects %p", (value) => {
    expect(isASMetadata(value)).toBe(false);
  });

  it.each([
    "issuer",
    "token_endpoint",
    "response_types_supported",
    "grant_types_supported",
    "token_endpoint_auth_methods_supported",
    "client_id_metadata_document_supported",
  ])("rejects metadata without %s", (field) => {
    const metadata: Record<string, unknown> = validAsMetadata();
    delete metadata[field];
    expect(isASMetadata(metadata)).toBe(false);
  });

  it("rejects an explicitly invalid value rather than defaulting it", () => {
    expect(
      isASMetadata(
        setAsMetaDefaults({
          ...validAsMetadata(),
          grant_types_supported: "not an array",
        }),
      ),
    ).toBe(false);
  });

  it("accepts metadata without scopes_supported, which is only recommended", () => {
    const { scopes_supported: _omitted, ...withoutScopes } = validAsMetadata();
    expect(isASMetadata(withoutScopes)).toBe(true);
  });

  it("rejects scopes_supported which is not an array of strings", () => {
    expect(
      isASMetadata({ ...validAsMetadata(), scopes_supported: "some:scope" }),
    ).toBe(false);
  });
});

describe("exchange", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs an RFC 8693 token exchange request to the token endpoint", async () => {
    const fetchSpy = mockTokenEndpoint(
      new Response(JSON.stringify(validTokenResponse())),
    );
    await exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [target, init] = fetchSpy.mock.calls[0];
    expect(target).toBe(TOKEN_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );
    const body = new URLSearchParams(init?.body as URLSearchParams);
    expect(Object.fromEntries(body.entries())).toStrictEqual({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: SUBJECT_TOKEN,
      // The subject token is the user's ID token.
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      audience: AUDIENCE,
      resource: RESOURCE,
    });
  });

  it.each([
    ["bearer", "Bearer"],
    ["BEARER", "Bearer"],
    ["dpop", "DPoP"],
    ["DPOP", "DPoP"],
  ])(
    "accepts the %s token type case-insensitively, and normalizes it to %s",
    async (tokenType, normalized) => {
      mockTokenEndpoint(
        new Response(
          JSON.stringify({ ...validTokenResponse(), token_type: tokenType }),
        ),
      );
      await expect(
        exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE),
      ).resolves.toMatchObject({ token_type: normalized });
    },
  );

  it("returns the token endpoint response", async () => {
    mockTokenEndpoint(new Response(JSON.stringify(validTokenResponse())));
    await expect(
      exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE),
    ).resolves.toStrictEqual(validTokenResponse());
  });

  it("does not send a DPoP proof if no DPoP key is provided", async () => {
    const fetchSpy = mockTokenEndpoint(
      new Response(JSON.stringify(validTokenResponse())),
    );
    await exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE);
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).has("DPoP")).toBe(
      false,
    );
  });

  it("sends a DPoP proof for the token endpoint, bound to the subject token", async () => {
    const { keyPair, verificationKey } = await mockKeyPair();
    const fetchSpy = mockTokenEndpoint(
      new Response(JSON.stringify(validTokenResponse())),
    );
    await exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE, keyPair);

    const proof = new Headers(fetchSpy.mock.calls[0][1]?.headers).get("DPoP");
    expect(proof).not.toBeNull();
    const { payload, protectedHeader } = await jwtVerify(
      proof as string,
      verificationKey,
    );
    expect(protectedHeader).toMatchObject({
      typ: "dpop+jwt",
      jwk: keyPair.publicKey,
    });
    expect(payload).toMatchObject({
      // The proof targets the token endpoint, not the AS issuer (audience).
      htu: TOKEN_ENDPOINT,
      htm: "POST",
      ath: expectedAth(SUBJECT_TOKEN),
    });
    expect(typeof payload.jti).toBe("string");
    expect(typeof payload.iat).toBe("number");
  });

  it("throws if the token endpoint returns an error status", async () => {
    mockTokenEndpoint(new Response(undefined, { status: 400 }));
    const result = exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE);
    await expect(result).rejects.toThrow(
      "Unexpected token endoint response during exchange",
    );
    await expect(result).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: expect.stringContaining("400"),
      }),
    });
  });

  it("throws if the token endpoint response is not JSON", async () => {
    mockTokenEndpoint(new Response("not JSON"));
    await expect(
      exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE),
    ).rejects.toThrow("Unexpected token endoint response during exchange");
  });

  it.each([
    ["without an access token", { access_token: undefined }],
    ["with an unsupported token type", { token_type: "UMA" }],
    ["with an unsupported issued token type", { issued_token_type: "jwt" }],
  ])("throws if the response is %s", async (_, override) => {
    mockTokenEndpoint(
      new Response(JSON.stringify({ ...validTokenResponse(), ...override })),
    );
    await expect(
      exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE),
    ).rejects.toThrow("Unexpected token endoint response during exchange");
  });

  it("throws if the token endpoint cannot be reached", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network error"));
    await expect(
      exchange(SUBJECT_TOKEN, TOKEN_ENDPOINT, AUDIENCE, RESOURCE),
    ).rejects.toThrow("Unexpected token endoint response during exchange");
  });
});
