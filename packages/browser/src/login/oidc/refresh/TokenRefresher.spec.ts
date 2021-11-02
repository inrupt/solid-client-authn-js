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
import {
  EVENTS,
  mockStorageUtility,
  StorageUtilityMock,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
import { JWK, importJWK } from "jose";
import { refresh } from "@inrupt/oidc-client-ext";
import { EventEmitter } from "events";
import TokenRefresher from "./TokenRefresher";
import {
  mockDefaultIssuerConfigFetcher,
  IssuerConfigFetcherFetchConfigResponse,
} from "../__mocks__/IssuerConfigFetcher";
import { mockDefaultClientRegistrar } from "../__mocks__/ClientRegistrar";

jest.mock("@inrupt/oidc-client-ext");

const mockDefaultStorageContent = {
  "solidClientAuthenticationUser:mySession": {
    issuer: "https://my.idp",
    codeVerifier: "some code verifier",
    redirectUrl: "https://my.app/redirect",
    idTokenSignedResponseAlg: "ES256",
    dpop: "true",
  },
};

const mockRefresherDefaultStorageUtility = () =>
  mockStorageUtility(mockDefaultStorageContent);

const mockJwk = (): JWK => {
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

const mockKeyPair = async () => {
  return {
    privateKey: await importJWK(mockJwk()),
    // Use the same JWK for public and private key out of convenience, don't do
    // this in real life.
    publicKey: mockJwk(),
  };
};

const mockIdToken = (): string =>
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9teS5pZHAvIiwiYXVkIjoiaHR0cHM6Ly9yZXNvdXJjZS5leGFtcGxlLm9yZyIsImV4cCI6MTY2MjI2NjIxNiwiaWF0IjoxNDYyMjY2MjE2fQ.IwumuwJtQw5kUBMMHAaDPJBppfBpRHbiXZw_HlKe6GNVUWUlyQRYV7W7r9OQtHmMsi6GVwOckelA3ErmhrTGVw";

type AccessJwt = {
  sub: string;
  iss: string;
  aud: string;
  nbf: number;
  exp: number;
  cnf: {
    jkt: string;
  };
};

const mockWebId = (): string => "https://my.webid/";

const mockKeyBoundToken = (): AccessJwt => {
  return {
    sub: mockWebId(),
    iss: IssuerConfigFetcherFetchConfigResponse.issuer,
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: mockJwk().kid as string,
    },
  };
};

const mockDpopTokens = (): TokenEndpointResponse => {
  return {
    accessToken: JSON.stringify(mockKeyBoundToken()),
    idToken: mockIdToken(),
    tokenType: "DPoP",
  };
};

const mockOidcModule = async (response?: TokenEndpointResponse) => {
  const oidcModule = jest.requireMock("@inrupt/oidc-client-ext") as {
    refresh: typeof refresh;
  };
  oidcModule.refresh = jest.fn().mockReturnValueOnce(
    response === undefined
      ? {
          ...mockDpopTokens(),
          dpopKey: await mockKeyPair(),
          webId: mockWebId(),
        }
      : response
  ) as typeof refresh;
  return oidcModule;
};

const defaultMocks = {
  storageUtility: StorageUtilityMock,
  issuerConfigFetcher: mockDefaultIssuerConfigFetcher(),
  clientRegistrar: mockDefaultClientRegistrar(),
};

function getTokenRefresher(
  mocks: Partial<typeof defaultMocks> = defaultMocks
): TokenRefresher {
  return new TokenRefresher(
    mocks.storageUtility ?? defaultMocks.storageUtility,
    mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
    mocks.clientRegistrar ?? defaultMocks.clientRegistrar
  );
}

describe("TokenRefresher", () => {
  describe("refresh", () => {
    it("throws if no OIDC issuer can be retrieved from storage", async () => {
      const mockedStorage = mockStorageUtility({});

      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });

      await expect(
        refresher.refresh("mySession", "some refresh token")
      ).rejects.toThrow(
        "Failed to retrieve OIDC context from storage associated with session [mySession]"
      );
    });

    it("throws if the token type cannot be retrieved from storage", async () => {
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:mySession": {
          issuer: "https://my.idp",
        },
      });

      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });

      await expect(
        refresher.refresh("mySession", "some refresh token")
      ).rejects.toThrow(
        "Failed to retrieve OIDC context from storage associated with session [mySession]"
      );
    });

    it("throws if a refresh token isn't provided", async () => {
      const mockedStorage = mockRefresherDefaultStorageUtility();

      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });

      await expect(refresher.refresh("mySession")).rejects.toThrow(
        "Session [mySession] has no refresh token to allow it to refresh its access token."
      );
    });

    it("throws if a DPoP token is expected, but no DPoP key is provided", async () => {
      const mockedStorage = mockRefresherDefaultStorageUtility();

      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });

      await expect(
        refresher.refresh("mySession", "some refresh token")
      ).rejects.toThrow(
        "For session [mySession], the key bound to the DPoP access token must be provided to refresh said access token."
      );
    });

    // This tests for implementation rather than behaviour, but it does so for an internal
    // piece of code that is therefore tested elsewhere.
    it("calls oidc-client-ext::refresh", async () => {
      const mockedStorage = mockRefresherDefaultStorageUtility();
      const oidcModule = await mockOidcModule();
      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });
      const result = await refresher.refresh(
        "mySession",
        "some refresh token",
        await mockKeyPair()
      );
      expect(oidcModule.refresh).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockDpopTokens(),
        dpopKey: await mockKeyPair(),
        webId: mockWebId(),
      });
    });

    it("calls the refresh token rotation callback if a new refresh token is issued", async () => {
      const mockedStorage = mockRefresherDefaultStorageUtility();
      const mockEmitter = new EventEmitter();
      const mockEmit = jest.spyOn(mockEmitter, "emit");

      await mockOidcModule({
        ...mockDpopTokens(),
        refreshToken: "Some rotated refresh token",
        dpopKey: await mockKeyPair(),
        webId: mockWebId(),
      });
      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });

      await refresher.refresh(
        "mySession",
        "some old refresh token",
        await mockKeyPair(),
        mockEmitter
      );
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.NEW_REFRESH_TOKEN,
        "Some rotated refresh token"
      );
    });

    it("accepts a new refresh token without a callback", async () => {
      const mockedStorage = mockRefresherDefaultStorageUtility();
      await mockOidcModule({
        ...mockDpopTokens(),
        refreshToken: "Some rotated refresh token",
        dpopKey: await mockKeyPair(),
        webId: mockWebId(),
      });
      const refresher = getTokenRefresher({
        storageUtility: mockedStorage,
      });
      const result = await refresher.refresh(
        "mySession",
        "some refresh token",
        await mockKeyPair()
      );
      expect(result.refreshToken).toBe("Some rotated refresh token");
    });
  });
});
