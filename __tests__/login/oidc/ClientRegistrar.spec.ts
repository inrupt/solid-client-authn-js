/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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
import { IssuerConfigFetcherFetchConfigResponse } from "../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import { Response as NodeResponse } from "cross-fetch";
import URL from "url-parse";

/**
 * Test for ClientRegistrar
 */
describe("ClientRegistrar", () => {
  const defaultMocks = {
    fetcher: FetcherMock
  };
  function getClientRegistrar(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientRegistrar {
    return new ClientRegistrar(mocks.fetcher ?? defaultMocks.fetcher);
  }

  describe("getClient", () => {
    it("returns a formatted client object if the clientId is present", async () => {
      const clientRegistrar = getClientRegistrar();
      expect(
        await clientRegistrar.getClient(
          {
            redirect: new URL("https://example.com"),
            clientId: "coolApp"
          },
          IssuerConfigFetcherFetchConfigResponse
        )
      ).toMatchObject({
        clientId: "coolApp"
      });
    });

    it("properly performs dynamic registration", async () => {
      defaultMocks.fetcher.fetch.mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            client_id: "abcd",
            client_secret: "1234"
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const clientRegistrar = getClientRegistrar();
      const registrationUrl = new URL("https://idp.com/register");
      expect(
        await clientRegistrar.getClient(
          {
            redirect: new URL("https://example.com")
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl
          }
        )
      ).toMatchObject({
        clientId: "abcd",
        clientSecret: "1234"
      });
      expect(defaultMocks.fetcher.fetch).toHaveBeenCalledWith(registrationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          /* eslint-disable @typescript-eslint/camelcase */
          application_type: "web",
          redirect_uris: ["https://example.com"],
          subject_type: "pairwise",
          token_endpoint_auth_method: "client_secret_basic",
          code_challenge_method: "S256"
          /* eslint-enable @typescript-eslint/camelcase */
        })
      });
    });

    it("Fails if there is not registration endpoint", async () => {
      const clientRegistrar = getClientRegistrar();
      await expect(
        clientRegistrar.getClient(
          {
            redirect: new URL("https://example.com")
          },
          IssuerConfigFetcherFetchConfigResponse
        )
      ).rejects.toThrowError(
        "Dynamic Registration could not be completed because the issuer has no registration endpoint."
      );
    });

    it("handles a failure to dynamically register elegantly", async () => {
      defaultMocks.fetcher.fetch.mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse("bad stuff that's an error", {
          status: 400
        }) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const clientRegistrar = getClientRegistrar();
      const registrationUrl = new URL("https://idp.com/register");
      await expect(
        clientRegistrar.getClient(
          {
            redirect: new URL("https://example.com")
          },
          {
            ...IssuerConfigFetcherFetchConfigResponse,
            registrationEndpoint: registrationUrl
          }
        )
      ).rejects.toThrowError(
        "Login Registration Error: bad stuff that's an error"
      );
    });
  });
});
