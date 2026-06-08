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

import { randomUUID } from "crypto";
import { jest, it, describe, expect } from "@jest/globals";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import type { IOpenIdDynamicClient } from "core";
import ClientRegistrar from "./ClientRegistrar";
import { IssuerConfigFetcherFetchConfigResponse } from "./__mocks__/IssuerConfigFetcher";
import { mockDefaultClientConfig } from "./__mocks__/ClientRegistrar";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// ---------------------------------------------------------------------------
// MIGRATION (Phase 4): DCR now goes through oauth4webapi
// (`dynamicClientRegistrationRequest` + `processDynamicClientRegistrationResponse`)
// instead of openid-client `Issuer.Client.register`. We mock those two
// functions. IMPORTANT: the registration endpoint is now read from the passed
// `IIssuerConfig.registrationEndpoint` (the shared mock
// `IssuerConfigFetcherFetchConfigResponse` now carries one), not from a
// re-instantiated openid-client Issuer's metadata.
//
// NOTE (CI-validate): not executed in this branch (deps not installed).
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

const mockClientRegistration = (
  _issuerMetadata: Record<string, string | undefined>,
  clientMetadata: Record<string, unknown>,
) => {
  // Sets up the oauth4webapi DCR boundary mock.
  (
    oauth.dynamicClientRegistrationRequest as jest.Mock<any>
  ).mockResolvedValueOnce(new Response());
  (
    oauth.processDynamicClientRegistrationResponse as jest.Mock<any>
  ).mockResolvedValueOnce(clientMetadata);
};

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  const defaultMocks = {
    storage: mockStorageUtility({}),
  };
  function getClientRegistrar(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): ClientRegistrar {
    return new ClientRegistrar(mocks.storage ?? defaultMocks.storage);
  }

  describe("getClient", () => {
    it("fails if there is no registration endpoint", async () => {
      mockClientRegistration(
        {
          registration_endpoint: undefined,
        },
        mockDefaultClientConfig(),
      );

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      await expect(
        clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          // Explicitly omit the registration endpoint to trigger the failure
          // (the shared mock now carries one by default — Phase 4).
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: undefined,
          },
        ),
      ).rejects.toThrow(
        "Dynamic client registration cannot be performed, because issuer does not have a registration endpoint",
      );
    });

    it("retrieves client information from storage if they are present", async () => {
      const exampleSecret = randomUUID();
      const exampleClient = randomUUID();
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: exampleClient,
              clientSecret: exampleSecret,
              clientName: "my client name",
              idTokenSignedResponseAlg: "ES256",
              clientType: "static",
            },
          },
          false,
        ),
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );
      expect(client.clientId).toBe(exampleClient);
      expect(client.clientSecret).toBe(exampleSecret);
      expect(client.clientName).toBe("my client name");
      expect(client.idTokenSignedResponseAlg).toBe("ES256");
    });

    it("negotiates signing alg if not found in storage", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: randomUUID(),
              clientSecret: randomUUID(),
              clientName: "my client name",
              clientType: "dynamic",
              expiresAt: "95618140501000",
            },
          },
          false,
        ),
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );
      expect(client.idTokenSignedResponseAlg).toBe("ES256");
    });

    it("properly performs dynamic registration and saves client information", async () => {
      mockClientRegistration({}, mockDefaultClientConfig());
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );

      // Check that the returned value is what we expect
      expect(client.clientId).toEqual(mockDefaultClientConfig().client_id);
      expect(client.clientSecret).toEqual(
        mockDefaultClientConfig().client_secret,
      );
      expect((client as IOpenIdDynamicClient).expiresAt).toEqual(
        mockDefaultClientConfig().client_secret_expires_at,
      );
      expect(client.idTokenSignedResponseAlg).toEqual(
        mockDefaultClientConfig().id_token_signed_response_alg,
      );

      // Check that the client information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "clientId"),
      ).resolves.toEqual(mockDefaultClientConfig().client_id);
      await expect(
        mockStorage.getForUser("mySession", "clientSecret"),
      ).resolves.toEqual(mockDefaultClientConfig().client_secret);
      await expect(
        mockStorage.getForUser("mySession", "expiresAt"),
      ).resolves.toEqual(
        String(mockDefaultClientConfig().client_secret_expires_at),
      );
      await expect(
        mockStorage.getForUser("mySession", "idTokenSignedResponseAlg"),
      ).resolves.toEqual(
        mockDefaultClientConfig().id_token_signed_response_alg,
      );
    });

    it("performs dynamic client registration if client information from storage is expired", async () => {
      mockClientRegistration({}, mockDefaultClientConfig());
      const expiredSecret = randomUUID();
      const expiredClient = randomUUID();
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: expiredClient,
              clientSecret: expiredSecret,
              clientName: "my client name",
              idTokenSignedResponseAlg: "ES256",
              clientType: "dynamic",
              // This forces the client to be expired.
              expiresAt: "-1",
            },
          },
          false,
        ),
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );
      // The expired client should have been re-registered.
      expect(client.clientId).toBe(mockDefaultClientConfig().client_id);
      expect(client.clientSecret).toBe(mockDefaultClientConfig().client_secret);
      expect((client as IOpenIdDynamicClient).expiresAt).toBe(
        mockDefaultClientConfig().client_secret_expires_at,
      );
    });

    it("performs dynamic client registration if client information from storage is missing expiration date (legacy)", async () => {
      mockClientRegistration({}, mockDefaultClientConfig());
      const expiredSecret = randomUUID();
      const expiredClient = randomUUID();
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: expiredClient,
              clientSecret: expiredSecret,
              clientName: "my client name",
              idTokenSignedResponseAlg: "ES256",
              clientType: "dynamic",
              // The expiration date is missing.
            },
          },
          false,
        ),
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );
      // The expired client should have been re-registered.
      expect(client.clientId).toBe(mockDefaultClientConfig().client_id);
      expect(client.clientSecret).toBe(mockDefaultClientConfig().client_secret);
      expect((client as IOpenIdDynamicClient).expiresAt).toBe(
        mockDefaultClientConfig().client_secret_expires_at,
      );
    });

    it("retrieves dynamic client information from storage if they are present and never expire", async () => {
      const exampleSecret = randomUUID();
      const exampleClient = randomUUID();
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: exampleClient,
              clientSecret: exampleSecret,
              clientName: "my client name",
              idTokenSignedResponseAlg: "ES256",
              clientType: "dynamic",
              // The client registration never expires
              expiresAt: "0",
            },
          },
          false,
        ),
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );
      expect(client.clientId).toBe(exampleClient);
      expect(client.clientSecret).toBe(exampleSecret);
      expect(client.clientName).toBe("my client name");
      expect(client.idTokenSignedResponseAlg).toBe("ES256");
    });

    it("throws if the issuer doesn't avertise for supported signing algorithms", async () => {
      mockClientRegistration({}, mockDefaultClientConfig());
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      const issuerConfig = { ...IssuerConfigFetcherFetchConfigResponse };
      delete issuerConfig.idTokenSigningAlgValuesSupported;
      await expect(
        clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          issuerConfig,
        ),
      ).rejects.toThrow(
        "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory.",
      );
    });

    it("throws if no signing algorithm supported by the issuer match the client preferences", async () => {
      mockClientRegistration({}, mockDefaultClientConfig());
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      await expect(
        clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            idTokenSigningAlgValuesSupported: ["Some_bogus_algorithm"],
          },
        ),
      ).rejects.toThrow(
        'No signature algorithm match between ["Some_bogus_algorithm"] supported by the Identity Provider and ["ES256","RS256"] preferred by the client.',
      );
    });

    it("retrieves client information from storage after dynamic registration", async () => {
      mockClientRegistration({}, mockDefaultClientConfig());
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      let client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );
      // Re-request for the client. If not returned from memory, the mock throws.
      client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );

      // Check that the returned value is what we expect
      expect(client.clientId).toEqual(mockDefaultClientConfig().client_id);
    });

    it("uses stores the signing algorithm preferred by the client when the registration didn't return the used algorithm", async () => {
      const metadata = mockDefaultClientConfig();
      delete metadata.id_token_signed_response_alg;
      mockClientRegistration({}, metadata);
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        },
      );

      // Check that the returned algorithm value is what we expect
      expect(client.idTokenSignedResponseAlg).toBe(
        // This non-null assertion is fine in test code
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        IssuerConfigFetcherFetchConfigResponse
          .idTokenSigningAlgValuesSupported![0],
      );

      // Check that the expected algorithm information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "idTokenSignedResponseAlg"),
      ).resolves.toBe(
        // This non-null assertion is fine in test code
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        IssuerConfigFetcherFetchConfigResponse
          .idTokenSigningAlgValuesSupported![0],
      );
    });
  });
});
