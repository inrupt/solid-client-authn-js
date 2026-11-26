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
import {
  jest,
  it,
  describe,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import type { IIssuerConfig } from "@inrupt/solid-client-authn-core";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import type { ClientMetadata, ServerMetadata } from "openid-client";
import type { IOpenIdDynamicClient } from "core";
import ClientRegistrar from "./ClientRegistrar";
import { IssuerConfigFetcherFetchConfigResponse } from "./__mocks__/IssuerConfigFetcher";
import { mockDefaultClientConfig } from "./__mocks__/ClientRegistrar";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

const ISSUER = IssuerConfigFetcherFetchConfigResponse.issuer;
const REGISTRATION_ENDPOINT = `${ISSUER}/register`;
// 5000-01-07, in seconds.
const CLIENT_SECRET_EXPIRES_AT = 95618140501;

// The issuer configuration, as returned by the IssuerConfigFetcher, for an
// issuer supporting dynamic client registration.
const mockRegistrationIssuerConfig = (
  config: Partial<IIssuerConfig> = {},
): IIssuerConfig => ({
  ...IssuerConfigFetcherFetchConfigResponse,
  registrationEndpoint: REGISTRATION_ENDPOINT,
  ...config,
});

// The discovery document matching the issuer configuration above.
const mockDiscoveryDocument = (
  config: Partial<ServerMetadata> = {},
): ServerMetadata => ({
  issuer: ISSUER,
  authorization_endpoint:
    IssuerConfigFetcherFetchConfigResponse.authorizationEndpoint,
  token_endpoint: IssuerConfigFetcherFetchConfigResponse.tokenEndpoint,
  jwks_uri: IssuerConfigFetcherFetchConfigResponse.jwksUri,
  registration_endpoint: REGISTRATION_ENDPOINT,
  id_token_signing_alg_values_supported:
    IssuerConfigFetcherFetchConfigResponse.idTokenSigningAlgValuesSupported,
  ...config,
});

const mockRegisteredClient = (): ClientMetadata => ({
  ...mockDefaultClientConfig(),
  client_secret_expires_at: CLIENT_SECRET_EXPIRES_AT,
});

const mockJsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  let mockedFetch: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    mockedFetch = jest.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    // Discard any network response mocked but not consumed by a test.
    mockedFetch.mockRestore();
  });

  // Mocks the network responses for the issuer discovery and the client
  // registration performed by openid-client.
  const mockClientRegistration = (
    clientMetadata: ClientMetadata = mockRegisteredClient(),
    discoveryDocument: ServerMetadata = mockDiscoveryDocument(),
  ) => {
    mockedFetch
      .mockResolvedValueOnce(mockJsonResponse(discoveryDocument, 200))
      .mockResolvedValueOnce(mockJsonResponse(clientMetadata, 201));
  };

  const getRegistrationRequest = () => {
    const [url, init] = mockedFetch.mock.calls[1];
    return {
      url: url.toString(),
      method: init?.method,
      body: JSON.parse(init?.body as string),
    };
  };

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
          mockRegistrationIssuerConfig({ registrationEndpoint: undefined }),
        ),
      ).rejects.toThrow(
        "Dynamic client registration cannot be performed, because issuer does not have a registration endpoint",
      );
      expect(mockedFetch).not.toHaveBeenCalled();
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
        mockRegistrationIssuerConfig(),
      );
      expect(client.clientId).toBe(exampleClient);
      expect(client.clientSecret).toBe(exampleSecret);
      expect(client.clientName).toBe("my client name");
      expect(client.idTokenSignedResponseAlg).toBe("ES256");
      expect(mockedFetch).not.toHaveBeenCalled();
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
        mockRegistrationIssuerConfig(),
      );
      expect(client.idTokenSignedResponseAlg).toBe("ES256");
    });

    it("properly performs dynamic registration and saves client information", async () => {
      mockClientRegistration();
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
          clientName: "my client name",
        },
        mockRegistrationIssuerConfig(),
      );

      // Check that openid-client performed the discovery, then the registration
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch.mock.calls[0][0].toString()).toBe(
        `${ISSUER}/.well-known/openid-configuration`,
      );
      const registrationRequest = getRegistrationRequest();
      expect(registrationRequest.url).toBe(REGISTRATION_ENDPOINT);
      expect(registrationRequest.method).toBe("POST");
      expect(registrationRequest.body).toEqual({
        redirect_uris: ["https://example.com"],
        client_name: "my client name",
        id_token_signed_response_alg: "ES256",
        grant_types: ["authorization_code", "refresh_token"],
      });

      // Check that the returned value is what we expect
      expect(client.clientId).toEqual(mockRegisteredClient().client_id);
      expect(client.clientSecret).toEqual(mockRegisteredClient().client_secret);
      expect((client as IOpenIdDynamicClient).expiresAt).toEqual(
        CLIENT_SECRET_EXPIRES_AT,
      );
      expect(client.idTokenSignedResponseAlg).toEqual(
        mockRegisteredClient().id_token_signed_response_alg,
      );

      // Check that the client information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "clientId"),
      ).resolves.toEqual(mockRegisteredClient().client_id);
      await expect(
        mockStorage.getForUser("mySession", "clientSecret"),
      ).resolves.toEqual(mockRegisteredClient().client_secret);
      await expect(
        mockStorage.getForUser("mySession", "expiresAt"),
      ).resolves.toEqual(String(CLIENT_SECRET_EXPIRES_AT));
      await expect(
        mockStorage.getForUser("mySession", "idTokenSignedResponseAlg"),
      ).resolves.toEqual(mockRegisteredClient().id_token_signed_response_alg);
      await expect(
        mockStorage.getForUser("mySession", "clientType"),
      ).resolves.toBe("dynamic");
    });

    it("registers a public client if the registration returns no client secret", async () => {
      const { client_secret: _secret, ...publicClient } =
        mockDefaultClientConfig();
      mockClientRegistration(publicClient);
      const mockStorage = mockStorageUtility({});

      const client = await getClientRegistrar({
        storage: mockStorage,
      }).getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        mockRegistrationIssuerConfig(),
      );

      expect(client.clientId).toBe(publicClient.client_id);
      expect(client.clientSecret).toBeUndefined();
      expect((client as IOpenIdDynamicClient).expiresAt).toBeUndefined();
      await expect(
        mockStorage.getForUser("mySession", "clientSecret"),
      ).resolves.toBeUndefined();
    });

    it("registers no redirect URI if none is provided", async () => {
      mockClientRegistration();

      await getClientRegistrar({
        storage: mockStorageUtility({}),
      }).getClient({ sessionId: "mySession" }, mockRegistrationIssuerConfig());

      expect(getRegistrationRequest().body.redirect_uris).toEqual([]);
    });

    it("allows plain HTTP requests for a loopback issuer", async () => {
      const issuer = "http://localhost:3000/";
      mockClientRegistration(
        mockRegisteredClient(),
        mockDiscoveryDocument({
          issuer,
          registration_endpoint: `${issuer}register`,
        }),
      );

      const client = await getClientRegistrar({
        storage: mockStorageUtility({}),
      }).getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        mockRegistrationIssuerConfig({
          issuer,
          registrationEndpoint: `${issuer}register`,
        }),
      );

      expect(mockedFetch.mock.calls[0][0].toString()).toBe(
        `${issuer}.well-known/openid-configuration`,
      );
      expect(getRegistrationRequest().url).toBe(`${issuer}register`);
      expect(client.clientId).toBe(mockRegisteredClient().client_id);
    });

    it("performs dynamic client registration if client information from storage is expired", async () => {
      mockClientRegistration();
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
        mockRegistrationIssuerConfig(),
      );
      // The expired client should have been re-registered.
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(client.clientId).toBe(mockRegisteredClient().client_id);
      expect(client.clientSecret).toBe(mockRegisteredClient().client_secret);
      expect((client as IOpenIdDynamicClient).expiresAt).toBe(
        CLIENT_SECRET_EXPIRES_AT,
      );
    });

    it("performs dynamic client registration if client information from storage is missing expiration date (legacy)", async () => {
      mockClientRegistration();
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
        mockRegistrationIssuerConfig(),
      );
      // The expired client should have been re-registered.
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(client.clientId).toBe(mockRegisteredClient().client_id);
      expect(client.clientSecret).toBe(mockRegisteredClient().client_secret);
      expect((client as IOpenIdDynamicClient).expiresAt).toBe(
        CLIENT_SECRET_EXPIRES_AT,
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
        mockRegistrationIssuerConfig(),
      );
      expect(mockedFetch).not.toHaveBeenCalled();
      expect(client.clientId).toBe(exampleClient);
      expect(client.clientSecret).toBe(exampleSecret);
      expect(client.clientName).toBe("my client name");
      expect(client.idTokenSignedResponseAlg).toBe("ES256");
    });

    it("throws if the issuer doesn't avertise for supported signing algorithms", async () => {
      mockClientRegistration();
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      const issuerConfig = mockRegistrationIssuerConfig();
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
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it("throws if no signing algorithm supported by the issuer match the client preferences", async () => {
      mockClientRegistration();
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
          mockRegistrationIssuerConfig({
            idTokenSigningAlgValuesSupported: ["Some_bogus_algorithm"],
          }),
        ),
      ).rejects.toThrow(
        'No signature algorithm match between ["Some_bogus_algorithm"] supported by the Identity Provider and ["ES256","RS256"] preferred by the client.',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it("retrieves client information from storage after dynamic registration", async () => {
      mockClientRegistration();
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
        mockRegistrationIssuerConfig(),
      );
      // Re-request for the client. If not returned from storage, no network
      // response is mocked, so the registration would fail.
      client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        mockRegistrationIssuerConfig(),
      );

      // Check that the returned value is what we expect
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(client.clientId).toEqual(mockRegisteredClient().client_id);
    });

    it("uses stores the signing algorithm preferred by the client when the registration didn't return the used algorithm", async () => {
      const metadata = mockRegisteredClient();
      delete metadata.id_token_signed_response_alg;
      mockClientRegistration(metadata);
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
        mockRegistrationIssuerConfig(),
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
