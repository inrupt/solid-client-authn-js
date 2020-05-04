import IsomorphicJoseUtility from "../../src/jose/IsomorphicJoseUtility";
import { JSONWebKey } from "jose";

const sampleRsaKey = {
  kty: "RSA",
  kid: "iz8wd_1haRjTmpp2XA27oUXtnGCfEp6Pqvbx7oNS6v8",
  use: "sig",
  alg: "RS256",
  e: "AQAB",
  n:
    "vDpduL77AA1-XDuN5SJ2a3dtaCy_7HCf9LQYNSzDzBzVyZIaPdCc-QTvUctdianFV2zGxrpB69li6cy797I9K9UrjKnlCbvvaZj4RZ4k--jbvlMbXlCDVIiHuIBwG10PI75D3raKJ0budQnHpT9qy_ihTggtUkpp4PPbcppXq9jMgt25l_Fo9sdN1AJKOxjcypDg7ksNVeVUsecGg4NBIqu5Jc0EaiAMXNMgb_eb9NElf3X17GKkdA0l94PQdaEvzpS8PWIgZA5RIixdfDIC8NUch-p1F_9EOR4W9gcgg6IQzwAQ66wjHsp8x9xzKV3kPhHt12YHp0FE6jvIO-5gew",
  d:
    "KPBQ3hO7p-FHcGwLiqCaPPl2tEe3XoeIYsKg2T_pPgWvge3jAzrSSV8HZjTjHUPthfxEp4hvOgrH9q3u3ArKPzRYCnoRNLLJeaApr4qb5KZa1ORieXrtdX9UdY6J04nD9zQ0ssXk-nH0_0OnRouqgL6M5tnkcZd5u9GOEzj6hId8rzZaESuR7KUOahHGnSVhPGY5cjnhyxWbQwR5HwBgfytWdrb21H7ATHunORcwF_9W_U9oZ1bN2c0E3CYxJi0EmSbwqX-LSFz38kBkJxQm55kKJWeJ6AezzK-HA-oWLRvJs2Zrs0JRyRA3HcvAtHelADqq4JwgDgsGWy5j5mRW4Q",
  p:
    "9VmrWhU4S26s88uGKyUqtMYpZh9R8tGzgKQwJKO3BCPTzyqPpI81SZ0DWmQLLkKz19Yz-ccmAW0XjMswXgFs8XlUSaxP4qV_g8NNsK1EAqFLbeb_yt79KzTocM1zcP1BAfmfsAUW8lPOLrQrLvZbeorG9Z0knUNu0bCCLLU7yOM",
  q:
    "xGX0URRZJ3EPjocQBtLCr8MKPB7Vr7WqulwYlN8pByjxvzM2hZ3TOBOvYRlHP42zt68_zInTjNqVNrtpTIQdD7TFSDWdquf4AW6rH3lBcW0sMAoYZzRGGMtAwO3BqUoSDk8tmqpYUuRPGMWWWoBf0FNJC8fnrRcBmwVXNDT51Yk",
  dp:
    "mun3S3XCib5j7btAB9X71RCZ6yUzdQH7OOpyi2_jivWkM1ZIRDs4Bjbhex1YAemT7GAPiVK5KIVdLUTOUUzNINre4XWvKwgcL3INh9Se8JovKkGEmO-bIsDRUwgmL914Qmr-7QEJsBBCSzLvYUOkFwexADwsdi-xtSyhxODZ0sk",
  dq:
    "axU_6flTRvsRRWAE8AN4XUbVzMPvNNezl9rhGEK45wt_DAYLYz0TTk8FX8bdnxxO8gcenRJFA1am5um2Vx7tjYO90UpShj3mbjl-GjIN6Z9h6WuHtLW-xoQD8W1xGzGkuKKZNexNLh0Ht3T8LqoyE69lc4PyoOCbYn-99VwxICk",
  qi:
    "ro7vgqubBwDSxtaAXq3p25hHCjwGKa7Q1J_fPTkRhk5me_wNF1zx7dZ4qNW5EkFS9Ge5we5j0Ma6hiEveSN3zb9PVIFzjTvIMNdY9Gu3MXLIsr6OYWs5bS_azrBSmHVoUzuVdYJxctDklPHrO6FaeDnk21XTUBp2Q8i2j7dbo8g"
} as JSONWebKey;
const sampleEcKey = {
  kty: "EC",
  kid: "bIGFrnbjKM-UWjHJLpv3-q-7w36QvGYWJg3JWQlFHVY",
  use: "sig",
  alg: "ES512",
  crv: "P-521",
  x:
    "Ab649bRFHAukg6Tu-naxVpb9_VUnfucRb4Va43X6Hp4gKL8IypOzvzSiqH08sSbmpC2eMRlQSULALkGKwhWpvvYU",
  y:
    "AUCVRkZhfwOtV8rHbnkS0jH_F4XbCrYyq63BWZeScHC7HJlw50TtA_LR9BV5vu7Yp15ZGC3XStOehs157hUJltaG",
  d:
    "ADmQ72DRwUyWdkfi-5uRZweP0Ez6dTLMXses3HXTLN7n7da5vD9KF0B4L8c3R1KITYZxsnOlY-qlSAhMQdj4YFUl"
} as JSONWebKey;
const sampleJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb29sIjoicGF5bG9hZCIsImlhdCI6MTU4Nzc2MTI1N30.20NdSfWBNxblHB0_ZVR8EGS-_fKKvw8aCnxJF1UgVyo";

[
  {
    name: "IsomorphicJoseUtility",
    instance: new IsomorphicJoseUtility()
  }
].forEach(({ name, instance }) => {
  describe(name, () => {
    describe("generateJwk", () => {
      it("generates an RSA key", async () => {
        const key = await instance.generateJWK("RSA", 2048, {
          alg: "RS256",
          use: "sig"
        });
        expect(key.kty).toBe("RSA");
        expect(key.alg).toBe("RS256");
        expect(key.use).toBe("sig");
        expect(key.kid).toBeDefined();
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((key as any).e).toBeDefined();
        expect((key as any).n).toBeDefined();
        expect((key as any).d).toBeDefined();
        expect((key as any).p).toBeDefined();
        expect((key as any).q).toBeDefined();
        expect((key as any).dp).toBeDefined();
        expect((key as any).dq).toBeDefined();
        expect((key as any).qi).toBeDefined();
      });

      it("generates an EC key", async () => {
        const key = await instance.generateJWK("EC", "P-521", {
          alg: "ES512",
          use: "sig"
        });
        expect(key.kty).toBe("EC");
        expect(key.alg).toBe("ES512");
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((key as any).x).toBeDefined();
        expect((key as any).y).toBeDefined();
        expect((key as any).d).toBeDefined();
      });
    });

    describe("privateJWKToPublicJWK", () => {
      it("Converts an RSA key to public", async () => {
        const pubKey = await instance.privateJWKToPublicJWK(sampleRsaKey);
        expect(pubKey.kty).toBe("RSA");
        expect(pubKey.alg).toBe("RS256");
        expect(pubKey.use).toBe("sig");
        expect(pubKey.kid).toBe(sampleRsaKey.kid);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((pubKey as any).e).toBeUndefined();
        expect((pubKey as any).n).toBeUndefined();
        expect((pubKey as any).d).toBeUndefined();
        expect((pubKey as any).p).toBeUndefined();
        expect((pubKey as any).q).toBeUndefined();
        expect((pubKey as any).dp).toBeUndefined();
        expect((pubKey as any).dq).toBeUndefined();
        expect((pubKey as any).qi).toBeUndefined();
        /* eslint-enable @typescript-eslint/no-explicit-any */
      });

      it("Converts an EC key to public", async () => {
        const pubKey = await instance.privateJWKToPublicJWK(sampleEcKey);
        expect(pubKey.kty).toBe("EC");
        expect(pubKey.alg).toBe("ES512");
        expect(pubKey.use).toBe("sig");
        expect(pubKey.kid).toBe(sampleEcKey.kid);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((pubKey as any).x).toBeUndefined();
        expect((pubKey as any).y).toBeUndefined();
        expect((pubKey as any).d).toBeUndefined();
        /* eslint-enable @typescript-eslint/no-explicit-any */
      });
    });

    describe("signJwt", () => {
      it("signs a JWT with an RSA key", async () => {
        const signed = await instance.signJWT(
          {
            cool: "payload"
          },
          sampleRsaKey
        );
        expect(typeof signed).toBe("string");
      });
      it("signs a JWT with an EC key", async () => {
        const signed = await instance.signJWT(
          {
            cool: "payload"
          },
          sampleEcKey
        );
        expect(typeof signed).toBe("string");
      });
    });

    describe("decodeJwt", () => {
      it("decodes a valid JWT", async () => {
        const decoded = await instance.decodeJWT(sampleJwt);
        expect(decoded.cool).toBe("payload");
        expect(decoded.iat).toBeDefined();
      });
    });

    it("all works together without erroring", async () => {
      const key = await instance.generateJWK("RSA", 2048, {
        alg: "RS256",
        use: "sig"
      });
      await instance.privateJWKToPublicJWK(key);
      const signed = await instance.signJWT(
        {
          cool: "payload"
        },
        key
      );
      const decoded = await instance.decodeJWT(signed);
      expect(decoded.cool).toBe("payload");
      expect(decoded.iat).toBeDefined();
    });

    describe("generateCodeVerifier / generateCodeChallenge", () => {
      it("creates a verifier and challenge without erroring", async () => {
        const verifier = await instance.generateCodeVerifier();
        const challenge = await instance.generateCodeChallenge(verifier);
        expect(typeof challenge).toBe("string");
      });
    });
  });
});
