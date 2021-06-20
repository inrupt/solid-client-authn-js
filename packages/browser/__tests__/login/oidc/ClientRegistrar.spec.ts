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

import {
  StorageUtilityMock,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";
import { Response as NodeResponse } from "node-fetch";
import ClientRegistrar from "../../../src/login/oidc/ClientRegistrar";
import { IssuerConfigFetcherFetchConfigResponse } from "../../../src/login/oidc/__mocks__/IssuerConfigFetcher";

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  const defaultMocks = {
    storage: StorageUtilityMock,
  };
  function getClientRegistrar(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientRegistrar {
    return new ClientRegistrar(mocks.storage ?? defaultMocks.storage);
  }

  describe("getClient", () => {
    it("properly performs dynamic registration", async () => {
      // FIXME: this should mock out oidc-client-ext, instead of mimicking the
      // actual OIDC provider response.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetch = (jest.fn() as any).mockResolvedValueOnce(
        /* eslint-disable camelcase */
        new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234",
            redirect_uris: ["https://example.com"],
            id_token_signed_response_alg: "RS256",
          })
        ) as unknown as Response
        /* eslint-enable camelcase */
      );
      global.fetch = mockFetch;
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
          }
        )
      ).toMatchObject({
        clientId: "abcd",
        clientSecret: "1234",
      });
      expect(mockFetch).toHaveBeenCalledWith(registrationUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          /* eslint-disable camelcase */
          application_type: "web",
          redirect_uris: ["https://example.com"],
          subject_type: "pairwise",
          token_endpoint_auth_method: "client_secret_basic",
          id_token_signed_response_alg: "RS256",
          /* eslint-enable camelcase */
        }),
      });
    });

    it("can register a public client without secret", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetch = (jest.fn() as any).mockResolvedValueOnce(
        /* eslint-disable camelcase */
        new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            redirect_uris: ["https://example.com"],
          })
        ) as unknown as Response
        /* eslint-enable camelcase */
      );
      global.fetch = mockFetch;
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
        }
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
          IssuerConfigFetcherFetchConfigResponse
        )
      ).rejects.toThrow(
        "Dynamic Registration could not be completed because the issuer has no registration endpoint."
      );
    });

    it("handles a failure to dynamically register elegantly", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetch = (jest.fn() as any).mockResolvedValueOnce(
        /* eslint-disable camelcase */
        new NodeResponse('{"error":"bad stuff that\'s an error"}', {
          status: 400,
        }) as unknown as Response
        /* eslint-enable camelcase */
      );
      global.fetch = mockFetch;
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
          }
        )
      ).rejects.toThrow(
        "Client registration failed: [Error: Dynamic client registration failed: bad stuff that's an error - ]"
      );
    });

    it("retrieves client id and secret from storage if they are present", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              clientId: "an id",
              clientSecret: "a secret",
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
    });

    it("passes the registration token if provided", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetch = (jest.fn() as any).mockResolvedValueOnce(
        /* eslint-disable camelcase */
        new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234",
            redirect_uris: ["https://example.com"],
          })
        ) as unknown as Response
        /* eslint-enable camelcase */
      );
      global.fetch = mockFetch;

      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
          registrationAccessToken: "some token",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: "https://some.issuer/register",
        }
      );

      const registrationHeaders = mockFetch.mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(registrationHeaders.Authorization).toEqual("Bearer some token");
    });

    it("retrieves the registration token from storage if present", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:mySession": {
              registrationAccessToken: "some token",
            },
          },
          false
        ),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetch = (jest.fn() as any).mockResolvedValueOnce(
        /* eslint-disable camelcase */
        new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234",
            redirect_uris: ["https://example.com"],
          })
        ) as unknown as Response
        /* eslint-enable camelcase */
      );
      global.fetch = mockFetch;

      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: "https://example.com",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: "https://some.issuer/register",
        }
      );

      const registrationHeaders = mockFetch.mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(registrationHeaders.Authorization).toEqual("Bearer some token");
    });

    it("saves dynamic registration information", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetch = (jest.fn() as any).mockResolvedValueOnce(
        /* eslint-disable camelcase */
        new NodeResponse(
          JSON.stringify({
            client_id: "some id",
            client_secret: "some secret",
            redirect_uris: ["https://example.com"],
          })
        ) as unknown as Response
        /* eslint-enable camelcase */
      );
      global.fetch = mockFetch;
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
        }
      );

      await expect(
        myStorage.getForUser("mySession", "clientId", { secure: false })
      ).resolves.toEqual("some id");
      await expect(
        myStorage.getForUser("mySession", "clientSecret", { secure: false })
      ).resolves.toEqual("some secret");
    });
  });
});
