/*
 * Copyright 2020 Inrupt Inc.
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

import "reflect-metadata";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import ClientRegistrar from "./ClientRegistrar";
import {
  IssuerConfigFetcherFetchConfigResponse,
  mockDefaultIssuerConfig,
  mockIssuerConfig,
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
      const { Issuer } = jest.requireMock("openid-client");
      const mockedIssuerConfig = mockIssuerConfig({
        registration_endpoint: undefined,
      });
      const mockedIssuer = {
        metadata: mockedIssuerConfig,
      };
      Issuer.discover = jest.fn().mockResolvedValueOnce(mockedIssuer);

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
    });

    it("properly performs dynamic registration and saves client information", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client");
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: {
          register: jest.fn().mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.discover = jest.fn().mockResolvedValueOnce(mockedIssuer);
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

      // Check that the client information have been saved in storage
      await expect(
        mockStorage.getForUser("mySession", "clientId", { secure: true })
      ).resolves.toEqual(mockDefaultClientConfig().client_id);
      await expect(
        mockStorage.getForUser("mySession", "clientSecret", { secure: true })
      ).resolves.toEqual(mockDefaultClientConfig().client_secret);
    });

    it("retrieves a registration bearer token if present in storage", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client");
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: {
          register: jest.fn().mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.discover = jest.fn().mockResolvedValueOnce(mockedIssuer);
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
        {
          redirect_uris: ["https://example.com"],
        },
        {
          initialAccessToken: "a token",
        }
      );
    });

    it("uses a registration bearer token if provided", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client");
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: {
          register: jest.fn().mockResolvedValueOnce({
            metadata: mockDefaultClientConfig(),
          }),
        },
      };
      Issuer.discover = jest.fn().mockResolvedValueOnce(mockedIssuer);

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
        {
          redirect_uris: ["https://example.com"],
        },
        {
          initialAccessToken: "a token",
        }
      );
    });

    it("saves the registered client information for a public client in storage", async () => {
      // Sets up the mock-up for DCR
      const { Issuer } = jest.requireMock("openid-client");
      const mockedClientConfig = mockClientConfig({
        client_secret: undefined,
      });
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: {
          register: jest.fn().mockResolvedValueOnce({
            metadata: mockedClientConfig,
          }),
        },
      };
      Issuer.discover = jest.fn().mockResolvedValueOnce(mockedIssuer);
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
        mockStorage.getForUser("mySession", "clientId", { secure: true })
      ).resolves.toEqual(mockDefaultClientConfig().client_id);
      await expect(
        mockStorage.getForUser("mySession", "clientSecret", { secure: true })
      ).resolves.toBeUndefined();
    });
  });
});
