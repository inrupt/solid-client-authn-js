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
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import ClientRegistrar from "./ClientRegistrar";
import {
  IssuerConfigFetcherFetchConfigResponse,
  mockDefaultIssuerMetadata,
  mockIssuerMetadata,
} from "./__mocks__/IssuerConfigFetcher";
import {
  mockClientConfig,
  mockDefaultClientConfig,
} from "./__mocks__/ClientRegistrar";

jest.mock("openid-client");

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  const defaultMocks = {
    storage: mockStorageUtility({}),
  };
  function getClientRegistrar(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientRegistrar {
    return new ClientRegistrar(mocks.storage ?? defaultMocks.storage);
  }

  describe("getClient", () => {
    it("fails if there is not registration endpoint", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuerConfig = mockIssuerMetadata({
        registration_endpoint: undefined,
      });
      const mockedIssuer = {
        metadata: mockedIssuerConfig,
      };
      Issuer.mockReturnValue(mockedIssuer);

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
          IssuerConfigFetcherFetchConfigResponse
        )
      ).rejects.toThrow(
        "Dynamic client registration cannot be performed, because issuer does not have a registration endpoint"
      );
    });

    it("retrieves client information from storage if they are present", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: "an id",
              clientSecret: "a secret",
              clientName: "my client name",
              idTokenSignedResponseAlg: "ES256",
            },
          },
          false
        ),
      });
      const client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        }
      );
      expect(client.clientId).toEqual("an id");
      expect(client.clientSecret).toEqual("a secret");
      expect(client.clientName).toEqual("my client name");
      expect(client.idTokenSignedResponseAlg).toEqual("ES256");
    });

    it("properly performs dynamic registration and saves client information", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
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
        }
      );

      // Check that the returned value is what we expect
      expect(client.clientId).toEqual(mockDefaultClientConfig().client_id);
      expect(client.clientSecret).toEqual(
        mockDefaultClientConfig().client_secret
      );
      expect(client.idTokenSignedResponseAlg).toEqual(
        mockDefaultClientConfig().id_token_signed_response_alg
      );

      // Check that the client information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "clientId")
      ).resolves.toEqual(mockDefaultClientConfig().client_id);
      await expect(
        mockStorage.getForUser("mySession", "clientSecret")
      ).resolves.toEqual(mockDefaultClientConfig().client_secret);
      await expect(
        mockStorage.getForUser("mySession", "idTokenSignedResponseAlg")
      ).resolves.toEqual(
        mockDefaultClientConfig().id_token_signed_response_alg
      );
    });

    it("throws if the issuer doesn't avertise for supported signing algorithms", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
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
          issuerConfig
        )
      ).rejects.toThrow(
        "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory."
      );
    });

    it("throws if no signing algorithm supported by the issuer match the client preferences", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
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
          }
        )
      ).rejects.toThrow(
        'No signature algorithm match between ["Some_bogus_algorithm"] supported by the Identity Provider and ["ES256","RS256"] preferred by the client.'
      );
    });

    it("retrieves client information from storage after dynamic registration", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any)
            .mockResolvedValueOnce({
              metadata: mockDefaultClientConfig(),
            })
            .mockRejectedValue("Cannot register more than once"),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
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
        }
      );
      // Re-request for the client. If not returned from memory, the mock throws.
      client = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        }
      );

      // Check that the returned value is what we expect
      expect(client.clientId).toEqual(mockDefaultClientConfig().client_id);
    });

    it("retrieves a registration bearer token if present in storage", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
      const mockStorage = mockStorageUtility(
        {
          "solidClientAuthenticationUser:mySession": {
            registrationAccessToken: "a token",
          },
        },
        false
      );

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        }
      );
      expect(mockedIssuer.Client.register).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_uris: ["https://example.com"],
        }),
        {
          initialAccessToken: "a token",
        }
      );
    });

    it("uses a registration bearer token if provided", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);

      // Run the test
      const clientRegistrar = getClientRegistrar();
      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
          registrationAccessToken: "a token",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        }
      );
      expect(mockedIssuer.Client.register).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_uris: ["https://example.com"],
        }),
        {
          initialAccessToken: "a token",
        }
      );
    });

    it("saves the registered client information for a public client in storage", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const mockedClientConfig = mockClientConfig({
        client_secret: undefined,
      });
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata: mockedClientConfig,
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
      const mockStorage = mockStorageUtility({});

      // Run the test
      const clientRegistrar = getClientRegistrar({
        storage: mockStorage,
      });
      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
        }
      );
      await expect(
        mockStorage.getForUser("mySession", "clientId")
      ).resolves.toEqual(mockDefaultClientConfig().client_id);
      await expect(
        mockStorage.getForUser("mySession", "clientSecret")
      ).resolves.toBeUndefined();
    });

    it("uses stores the signing algorithm preferred by the client when the registration didn't return the used algorithm", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client") as any;
      const metadata = mockDefaultClientConfig();
      delete metadata.id_token_signed_response_alg;
      const mockedIssuer = {
        metadata: mockDefaultIssuerMetadata(),
        Client: {
          register: (jest.fn() as any).mockResolvedValueOnce({
            metadata,
          }),
        },
      };
      Issuer.mockReturnValue(mockedIssuer);
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
        }
      );

      // Check that the returned algorithm value is what we expect
      expect(client.idTokenSignedResponseAlg).toBe(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        IssuerConfigFetcherFetchConfigResponse.idTokenSigningAlgValuesSupported![0]
      );

      // Check that the expected algorithm information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "idTokenSignedResponseAlg")
      ).resolves.toBe(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        IssuerConfigFetcherFetchConfigResponse.idTokenSigningAlgValuesSupported![0]
      );
    });
  });
});
