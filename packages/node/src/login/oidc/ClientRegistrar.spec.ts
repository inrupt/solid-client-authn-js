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

import { randomUUID } from "crypto";
import { jest, it, describe, expect } from "@jest/globals";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import type * as OpenIdClient from "openid-client";
import type { IOpenIdDynamicClient } from "core";
import ClientRegistrar from "./ClientRegistrar";
import {
  IssuerConfigFetcherFetchConfigResponse,
  mockIssuerMetadata,
} from "./__mocks__/IssuerConfigFetcher";
import { mockDefaultClientConfig } from "./__mocks__/ClientRegistrar";

jest.mock("openid-client");

const mockClientRegistration = (
  issuerMetadata: Record<string, string | undefined>,
  clientMetadata: OpenIdClient.ClientMetadata,
) => {
  // Sets up the mock-up for DCR
  const { Issuer } = jest.requireMock("openid-client") as jest.Mocked<
    typeof OpenIdClient
  >;
  const mockedIssuerConfig = mockIssuerMetadata(issuerMetadata);
  const mockedIssuer: OpenIdClient.Issuer<OpenIdClient.BaseClient> = {
    metadata: mockedIssuerConfig,
    Client: {
      register: (jest.fn() as any).mockResolvedValueOnce({
        metadata: clientMetadata,
      }),
      // The assertions are required because we only mock what is strictly necessary for our tests.
    } as any,
  } as any;

  Issuer.mockReturnValue(
    mockedIssuer as jest.MockedObject<
      OpenIdClient.Issuer<OpenIdClient.BaseClient>
    >,
  );
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
          IssuerConfigFetcherFetchConfigResponse,
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        IssuerConfigFetcherFetchConfigResponse
          .idTokenSigningAlgValuesSupported![0],
      );

      // Check that the expected algorithm information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "idTokenSignedResponseAlg"),
      ).resolves.toBe(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        IssuerConfigFetcherFetchConfigResponse
          .idTokenSigningAlgValuesSupported![0],
      );
    });
  });
});
