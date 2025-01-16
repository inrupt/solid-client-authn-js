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

import {
  StorageUtilityMock,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core/mocks";
import { jest, it, describe, expect } from "@jest/globals";
import { randomUUID } from "crypto";
import type * as OidcClientExt from "@inrupt/oidc-client-ext";
import type { IOpenIdDynamicClient } from "core";
import ClientRegistrar from "./ClientRegistrar";
import { IssuerConfigFetcherFetchConfigResponse } from "./__mocks__/IssuerConfigFetcher";

jest.mock("@inrupt/oidc-client-ext", () => {
  return {
    registerClient: jest.fn(),
  };
});

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  const defaultMocks = {
    storage: StorageUtilityMock,
  };
  function getClientRegistrar(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): ClientRegistrar {
    return new ClientRegistrar(mocks.storage ?? defaultMocks.storage);
  }

  describe("getClient", () => {
    it("performs dynamic registration if no client is in storage", async () => {
      // Setup registration mock.
      const client: IOpenIdDynamicClient = {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        expiresAt: Date.now() + 1000,
        clientType: "dynamic",
      };
      const { registerClient: mockedRegisterClient } = jest.requireMock(
        "@inrupt/oidc-client-ext",
      ) as jest.Mocked<typeof OidcClientExt>;
      mockedRegisterClient.mockResolvedValueOnce(client);

      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      const registrationUrl = "https://idp.com/register";
      expect(
        await clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl,
          },
        ),
      ).toMatchObject(client);
    });

    it("can register a public client without secret", async () => {
      // Setup registration mock.
      const client: IOpenIdDynamicClient = {
        clientId: randomUUID(),
        clientType: "dynamic",
      };
      const { registerClient: mockedRegisterClient } = jest.requireMock(
        "@inrupt/oidc-client-ext",
      ) as jest.Mocked<typeof OidcClientExt>;
      mockedRegisterClient.mockResolvedValueOnce(client);

      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      const registrationUrl = "https://idp.com/register";
      const registeredClient = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: registrationUrl,
        },
      );
      expect(registeredClient.clientSecret).toBeUndefined();
    });

    it("Fails if there is not registration endpoint", async () => {
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
      ).rejects.toThrow();
    });

    it("handles a failure to dynamically register elegantly", async () => {
      // Setup registration mock.
      const { registerClient: mockedRegisterClient } = jest.requireMock(
        "@inrupt/oidc-client-ext",
      ) as jest.Mocked<typeof OidcClientExt>;
      mockedRegisterClient.mockRejectedValueOnce(
        new Error("Dynamic client registration failed"),
      );

      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      const registrationUrl = "https://idp.com/register";
      await expect(
        clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl,
          },
        ),
      ).rejects.toThrow("Client registration failed");
    });

    it("retrieves client id and secret from storage if they are present", async () => {
      const clientId = randomUUID();
      const clientSecret = randomUUID();
      const expiresAt = Math.ceil((Date.now() + 100_000) / 1000);
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId,
              clientSecret,
              expiresAt: String(expiresAt),
              clientType: "dynamic",
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
      expect(client.clientId).toBe(clientId);
      expect(client.clientSecret).toBe(clientSecret);
      expect(client.clientType).toBe("dynamic");
      expect((client as IOpenIdDynamicClient).expiresAt).toBe(expiresAt);
    });

    it("performs dynamic registration if an expired client is present in storage", async () => {
      // Setup the registration mock.
      const renewedClient: IOpenIdDynamicClient = {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        // Date.now is in ms, and the expiration date is in seconds.
        expiresAt: Math.ceil((Date.now() + 100_000) / 1000),
        clientType: "dynamic",
      };
      const { registerClient: mockedRegisterClient } = jest.requireMock(
        "@inrupt/oidc-client-ext",
      ) as jest.Mocked<typeof OidcClientExt>;
      mockedRegisterClient.mockResolvedValueOnce(renewedClient);
      const expiredClient: IOpenIdDynamicClient = {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        // Date.now is in ms, and the expiration date is in seconds.
        expiresAt: Math.ceil((Date.now() - 100_000) / 1000),
        clientType: "dynamic",
      };

      // Setup the expired client in storage mock.
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: expiredClient.clientId,
              clientSecret: expiredClient.clientSecret,
              expiresAt: String(expiredClient.expiresAt),
              clientType: expiredClient.clientType,
            },
          },
          false,
        ),
      });
      const registrationUrl = "https://idp.com/register";
      expect(
        await clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl,
          },
        ),
      ).toMatchObject(renewedClient);
    });

    it("performs dynamic registration if a confidential client is missing an expiration date (legacy case)", async () => {
      // Setup the registration mock.
      const renewedClient: IOpenIdDynamicClient = {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        expiresAt: Date.now() + 1000,
        clientType: "dynamic",
      };
      const { registerClient: mockedRegisterClient } = jest.requireMock(
        "@inrupt/oidc-client-ext",
      ) as jest.Mocked<typeof OidcClientExt>;
      mockedRegisterClient.mockResolvedValueOnce(renewedClient);

      // Setup the legacy client in storage mock.
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: randomUUID(),
              clientSecret: randomUUID(),
              clientType: "dynamic",
              // The expiration date is missing.
            },
          },
          false,
        ),
      });
      const registrationUrl = "https://idp.com/register";
      expect(
        await clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: "https://example.com",
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl,
          },
        ),
      ).toMatchObject(renewedClient);
    });

    it("saves dynamic registration information", async () => {
      // Setup registration mock.
      const client: IOpenIdDynamicClient = {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        expiresAt: Math.ceil((Date.now() + 10_000) / 1000),
        clientType: "dynamic",
      };
      const { registerClient: mockedRegisterClient } = jest.requireMock(
        "@inrupt/oidc-client-ext",
      ) as jest.Mocked<typeof OidcClientExt>;
      mockedRegisterClient.mockResolvedValueOnce(client);

      const myStorage = mockStorageUtility({});
      const clientRegistrar = getClientRegistrar({
        storage: myStorage,
      });
      const registrationUrl = "https://idp.com/register";

      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: registrationUrl,
        },
      );

      await expect(
        myStorage.getForUser("mySession", "clientId", { secure: false }),
      ).resolves.toBe(client.clientId);
      await expect(
        myStorage.getForUser("mySession", "clientSecret", { secure: false }),
      ).resolves.toBe(client.clientSecret);
      await expect(
        myStorage.getForUser("mySession", "expiresAt", { secure: false }),
      ).resolves.toBe(String(client.expiresAt));
    });
  });
});
