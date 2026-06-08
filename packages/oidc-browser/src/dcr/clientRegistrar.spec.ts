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
import type {
  IIssuerConfig,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";
import { registerClient } from "./clientRegistrar";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// ---------------------------------------------------------------------------
// MIGRATION (Phase 2): DCR delegates to oauth4webapi's
// `dynamicClientRegistrationRequest` / `processDynamicClientRegistrationResponse`.
// We mock the oauth4webapi boundary. OAuth-style error bodies surface as
// `ResponseBodyError`, which the implementation reshapes into inrupt's
// contextual messages. Not executed in this branch — CI-validate.
// ---------------------------------------------------------------------------

jest.mock("oauth4webapi", () => {
  const actual = jest.requireActual("oauth4webapi") as any;
  return {
    ...actual,
    dynamicClientRegistrationRequest: jest.fn(() =>
      Promise.resolve(new Response()),
    ),
    processDynamicClientRegistrationResponse: jest.fn(),
  };
});

// eslint-disable-next-line import/first
import * as oauth from "oauth4webapi";

const mockedProcess =
  oauth.processDynamicClientRegistrationResponse as jest.Mock<any>;

const getMockIssuer = (): IIssuerConfig => {
  return {
    issuer: "https://some.issuer",
    authorizationEndpoint: "https://some.issuer/autorization",
    tokenEndpoint: "https://some.issuer/token",
    jwksUri: "https://some.issuer/keys",
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public"],
    registrationEndpoint: "https://some.issuer/registration",
    idTokenSigningAlgValuesSupported: ["RS256"],
    scopesSupported: ["openid"],
  };
};

const getMockOptions = (): IClientRegistrarOptions => {
  return {
    sessionId: "mySession",
  };
};

function mockResponseBodyError(
  error: string,
  error_description?: string,
): Error {
  return Object.assign(new oauth.ResponseBodyError("err", {} as any), {
    error,
    error_description,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedProcess.mockResolvedValue({
    client_id: "some id",
    client_secret: "some secret",
    redirect_uris: ["https://some.url"],
    id_token_signed_response_alg: "RS256",
  });
});

describe("registerClient", () => {
  it("throws if no registration point is available", async () => {
    const mockIssuer = getMockIssuer();
    delete mockIssuer.registrationEndpoint;
    await expect(() =>
      registerClient(getMockOptions(), mockIssuer),
    ).rejects.toThrow(
      "Dynamic Registration could not be completed because the issuer has no registration endpoint.",
    );
  });

  it("throws if the issuer doesn't advertize for supported signature algorithms", async () => {
    const mockIssuer = { ...getMockIssuer() };
    delete mockIssuer.idTokenSigningAlgValuesSupported;
    await expect(() =>
      registerClient(getMockOptions(), mockIssuer),
    ).rejects.toThrow(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory.",
    );
  });

  it("extracts the client info from the IdP response", async () => {
    const client = await registerClient(getMockOptions(), getMockIssuer());
    expect(client.clientId).toBe("some id");
    expect(client.clientSecret).toBe("some secret");
    expect(client.idTokenSignedResponseAlg).toBe("RS256");
    expect(client.clientType).toBe("dynamic");
  });

  it("sends the expected client metadata (auth-code+refresh, no challenge method)", async () => {
    const options = getMockOptions();
    await registerClient(options, getMockIssuer());

    const metadata = (
      oauth.dynamicClientRegistrationRequest as jest.Mock<any>
    ).mock.calls[0][1];
    expect(metadata).toMatchObject({
      application_type: "web",
      subject_type: "public",
      token_endpoint_auth_method: "client_secret_basic",
      id_token_signed_response_alg: "RS256",
      grant_types: ["authorization_code", "refresh_token"],
    });
  });

  it("passes the specified redirection URL to the IdP", async () => {
    const options = getMockOptions();
    options.redirectUrl = "https://some.url";
    await registerClient(options, getMockIssuer());
    const metadata = (
      oauth.dynamicClientRegistrationRequest as jest.Mock<any>
    ).mock.calls[0][1];
    expect(metadata.redirect_uris).toEqual(["https://some.url"]);
  });

  it("throws if the IdP returns a mismatching redirect URL", async () => {
    mockedProcess.mockResolvedValue({
      client_id: "some id",
      client_secret: "some secret",
      redirect_uris: ["https://some.other.url"],
    });
    const options = getMockOptions();
    options.redirectUrl = "https://some.url";
    await expect(() =>
      registerClient(options, getMockIssuer()),
    ).rejects.toThrow(
      'Dynamic client registration failed: the returned redirect URIs ["https://some.other.url"] don\'t match the provided ["https://some.url"]',
    );
  });

  it("throws if no client_id is returned", async () => {
    mockedProcess.mockResolvedValue({ some_key: "some value" });
    await expect(() =>
      registerClient(getMockOptions(), getMockIssuer()),
    ).rejects.toThrow(
      'Dynamic client registration failed: no client_id has been found on {"some_key":"some value"}',
    );
  });

  it("reshapes an invalid_redirect_uri ResponseBodyError", async () => {
    mockedProcess.mockRejectedValue(
      mockResponseBodyError("invalid_redirect_uri", "some description"),
    );
    const options = getMockOptions();
    options.redirectUrl = "https://some.url";
    await expect(() =>
      registerClient(options, getMockIssuer()),
    ).rejects.toThrow(
      "Dynamic client registration failed: the provided redirect uri [https://some.url] is invalid - some description",
    );
  });

  it("reshapes an invalid_client_metadata ResponseBodyError", async () => {
    mockedProcess.mockRejectedValue(
      mockResponseBodyError("invalid_client_metadata", "some description"),
    );
    await expect(() =>
      registerClient(getMockOptions(), getMockIssuer()),
    ).rejects.toThrow(
      'Dynamic client registration failed: the provided client metadata {"sessionId":"mySession"} is invalid - some description',
    );
  });

  it("reshapes a custom ResponseBodyError", async () => {
    mockedProcess.mockRejectedValue(
      mockResponseBodyError("custom_error", "some description"),
    );
    await expect(() =>
      registerClient(getMockOptions(), getMockIssuer()),
    ).rejects.toThrow(
      "Dynamic client registration failed: custom_error - some description",
    );
  });

  it("rethrows non-OAuth errors unchanged", async () => {
    mockedProcess.mockRejectedValue(new TypeError("network down"));
    await expect(() =>
      registerClient(getMockOptions(), getMockIssuer()),
    ).rejects.toThrow("network down");
  });
});
