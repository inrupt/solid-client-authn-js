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
import { FetcherMock } from "../../../src/util/__mocks__/Fetcher";
import ClientRegistrar from "../../../src/login/oidc/ClientRegistrar";
import {
  StorageUtilityMock,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { IssuerConfigFetcherFetchConfigResponse } from "../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import { Response as NodeResponse } from "node-fetch";
import URL from "url-parse";

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    storage: StorageUtilityMock,
  };
  function getClientRegistrar(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientRegistrar {
    return new ClientRegistrar(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.storage ?? defaultMocks.storage
    );
  }

  describe("getClient", () => {
    it("properly performs dynamic registration", async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234",
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const savedFetch = global.fetch;
      global.fetch = mockFetch;
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      const registrationUrl = new URL("https://idp.com/register");
      expect(
        await clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: new URL("https://example.com"),
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
          /* eslint-disable @typescript-eslint/camelcase */
          application_type: "web",
          redirect_uris: ["https://example.com"],
          subject_type: "pairwise",
          token_endpoint_auth_method: "client_secret_basic",
          code_challenge_method: "S256",
          /* eslint-enable @typescript-eslint/camelcase */
        }),
      });
      global.fetch = savedFetch;
    });

    it("can register a public client without secret", async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const savedFetch = global.fetch;
      global.fetch = mockFetch;
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      const registrationUrl = new URL("https://idp.com/register");
      const registeredClient = await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: new URL("https://example.com"),
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: registrationUrl,
        }
      );
      expect(registeredClient.clientSecret).toBeUndefined();
      global.fetch = savedFetch;
    });

    it("Fails if there is not registration endpoint", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      await expect(
        clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: new URL("https://example.com"),
          },
          IssuerConfigFetcherFetchConfigResponse
        )
      ).rejects.toThrowError(
        "Dynamic Registration could not be completed because the issuer has no registration endpoint."
      );
    });

    it("handles a failure to dynamically register elegantly", async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse("bad stuff that's an error", {
          status: 400,
        }) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const savedFetch = global.fetch;
      global.fetch = mockFetch;
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility({}),
      });
      const registrationUrl = new URL("https://idp.com/register");
      await expect(
        clientRegistrar.getClient(
          {
            sessionId: "mySession",
            redirectUrl: new URL("https://example.com"),
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl,
          }
        )
      ).rejects.toThrowError(
        "Login Registration Error: bad stuff that's an error"
      );
      global.fetch = savedFetch;
    });

    it("retrieves client id and secret from storage if they are present", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            mySession: {
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
          redirectUrl: new URL("https://example.com"),
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

      const mockFetch = jest.fn().mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234",
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const savedFetch = global.fetch;
      global.fetch = mockFetch;

      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: new URL("https://example.com"),
          registrationAccessToken: "some token",
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: new URL("https://some.issuer/register"),
        }
      );

      const registrationHeaders = mockFetch.mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(registrationHeaders["Authorization"]).toEqual("Bearer some token");
      global.fetch = savedFetch;
    });

    it("retrieves the registration token from storage if present", async () => {
      const clientRegistrar = getClientRegistrar({
        storage: mockStorageUtility(
          {
            mySession: {
              registrationAccessToken: "some token",
            },
          },
          false
        ),
      });

      const mockFetch = jest.fn().mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234",
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const savedFetch = global.fetch;
      global.fetch = mockFetch;

      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: new URL("https://example.com"),
        },
        {
          ...IssuerConfigFetcherFetchConfigResponse,
          registrationEndpoint: new URL("https://some.issuer/register"),
        }
      );

      const registrationHeaders = mockFetch.mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(registrationHeaders["Authorization"]).toEqual("Bearer some token");
      global.fetch = savedFetch;
    });

    it("saves dynamic registration information", async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            client_id: "some id",
            client_secret: "some secret",
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const savedFetch = global.fetch;
      global.fetch = mockFetch;
      const myStorage = mockStorageUtility({});
      const clientRegistrar = getClientRegistrar({
        storage: myStorage,
      });
      const registrationUrl = new URL("https://idp.com/register");

      await clientRegistrar.getClient(
        {
          sessionId: "mySession",
          redirectUrl: new URL("https://example.com"),
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

      global.fetch = savedFetch;
    });
  });
});
