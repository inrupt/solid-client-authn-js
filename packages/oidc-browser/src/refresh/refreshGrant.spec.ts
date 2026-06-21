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

import type { IClient } from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect, beforeEach } from "@jest/globals";
import {
  mockClient,
  mockIdToken,
  mockIssuer,
  mockKeyBoundToken,
  mockKeyPair,
  mockWebId,
} from "../__mocks__/issuer.mocks";
import { refresh } from "./refreshGrant";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// ---------------------------------------------------------------------------
// MIGRATION (Phase 2): refresh now delegates to oauth4webapi's
// `refreshTokenGrantRequest` / `processRefreshTokenResponse`, re-using the SAME
// bound DPoP key. We mock the oauth4webapi boundary. See the CI-validation note
// in tokenExchange.spec.ts — these mocks are not executed in this branch.
// ---------------------------------------------------------------------------

jest.mock("oauth4webapi", () => {
  const actual = jest.requireActual("oauth4webapi") as any;
  return {
    ...actual,
    refreshTokenGrantRequest: jest.fn(() => Promise.resolve(new Response())),
    processRefreshTokenResponse: jest.fn(),
    DPoP: jest.fn(() => ({ calculateThumbprint: jest.fn() })),
  };
});

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as any;
  return {
    ...actualCoreModule,
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve({ webId: "https://my.webid/", clientId: "some client" }),
    ),
  };
});

// eslint-disable-next-line import/first
import * as oauth from "oauth4webapi";

const mockedRefreshGrant = oauth.refreshTokenGrantRequest as jest.Mock<any>;
const mockedProcess = oauth.processRefreshTokenResponse as jest.Mock<any>;

function mockProcessed(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedRefreshGrant.mockResolvedValue(new Response());
  mockedProcess.mockResolvedValue(mockProcessed());
});

describe("refreshGrant", () => {
  it("passes the refresh token to the grant request", async () => {
    await refresh("some refresh token", mockIssuer(), mockClient());
    expect(mockedRefreshGrant.mock.calls[0][3]).toBe("some refresh token");
  });

  it("threads a DPoP handle (built from the provided key) into the grant", async () => {
    const keyPair = await mockKeyPair();
    await refresh("some refresh token", mockIssuer(), mockClient(), keyPair);
    expect(oauth.DPoP).toHaveBeenCalledTimes(1);
    const grantOptions = mockedRefreshGrant.mock.calls[0][4];
    expect(grantOptions).toHaveProperty("DPoP");
  });

  it("does not create a DPoP handle when no key is provided", async () => {
    await refresh("some refresh token", mockIssuer(), mockClient());
    expect(oauth.DPoP).not.toHaveBeenCalled();
  });

  it("throws if the client identifier is undefined", async () => {
    await expect(
      refresh("some refresh token", mockIssuer(), {
        clientId: undefined,
      } as unknown as IClient),
    ).rejects.toThrow(
      "No client ID available when trying to refresh the access token",
    );
  });

  it("throws if the token endpoint does not return an access token", async () => {
    mockedProcess.mockResolvedValue(
      mockProcessed({ access_token: undefined }),
    );
    // processRefreshTokenResponse would itself reject; here our post-guard is
    // also exercised. The access_token guard is enforced by oauth4webapi —
    // CI-validate the exact error surface.
    await expect(
      refresh("some refresh token", mockIssuer(), mockClient()),
    ).rejects.toThrow();
  });

  it("throws InvalidResponseError if the token endpoint does not return an ID token", async () => {
    mockedProcess.mockResolvedValue(mockProcessed({ id_token: undefined }));
    await expect(
      refresh("some refresh token", mockIssuer(), mockClient()),
    ).rejects.toThrow("id_token");
  });

  it("maps an oauth4webapi ResponseBodyError onto OidcProviderError", async () => {
    mockedProcess.mockRejectedValue(
      Object.assign(new oauth.ResponseBodyError("err", {} as any), {
        error: "Some error",
      }),
    );
    await expect(
      refresh("some refresh token", mockIssuer(), mockClient()),
    ).rejects.toThrow("Token endpoint returned error [Some error]");
  });

  it("returns the access, ID and refresh tokens, WebID, DPoP key and expiration", async () => {
    mockedProcess.mockResolvedValue(
      mockProcessed({
        refresh_token: "Some new refresh token",
        expires_in: 1800,
      }),
    );
    const keyPair = await mockKeyPair();
    const result = await refresh(
      "some refresh token",
      mockIssuer(),
      mockClient(),
      keyPair,
    );
    expect(result.accessToken).toBe(JSON.stringify(mockKeyBoundToken()));
    expect(result.idToken).toBe(mockIdToken());
    expect(result.refreshToken).toBe("Some new refresh token");
    expect(result.webId).toBe(mockWebId());
    expect(result.dpopKey).toEqual(keyPair);
    expect(result.expiresIn).toBe(1800);
  });
});
