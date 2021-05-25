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
// eslint-disable-next-line no-shadow
import { Response } from "cross-fetch";
import {
  IIssuerConfig,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";
import { registerClient } from "./clientRegistrar";

const getMockIssuer = (): IIssuerConfig => {
  return {
    issuer: "https://some.issuer",
    authorizationEndpoint: "https://some.issuer/autorization",
    tokenEndpoint: "https://some.issuer/token",
    jwksUri: "https://some.issuer/keys",
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public", "pairwise"],
    registrationEndpoint: "https://some.issuer/registration",
    idTokenSigningAlgValuesSupported: ["RS256"],
  };
};

const getMockOptions = (): IClientRegistrarOptions => {
  return {
    sessionId: "mySession",
  };
};

const getSuccessfulFetch = (): typeof fetch =>
  (jest.fn().mockResolvedValue as any)(
    new Response(
      JSON.stringify({
        // eslint-disable-next-line camelcase
        client_id: "some id",
        // eslint-disable-next-line camelcase
        client_secret: "some secret",
        // eslint-disable-next-line camelcase
        redirect_uris: ["https://some.url"],
        // eslint-disable-next-line camelcase
        id_token_signed_response_alg: "RS256",
      }),
      { status: 200 }
    )
  ) as typeof fetch;

describe("registerClient", () => {
  global.fetch = getSuccessfulFetch();

  it("throws if no registration point is available", async () => {
    const mockIssuer = getMockIssuer();
    delete mockIssuer.registrationEndpoint;
    await expect(() =>
      registerClient(getMockOptions(), mockIssuer)
    ).rejects.toThrow(
      "Dynamic Registration could not be completed because the issuer has no registration endpoint."
    );
  });

  it("throws if the issuer doesn't advertize for supported signature algorithms", async () => {
    const mockIssuer = {
      ...getMockIssuer(),
    };
    delete mockIssuer.idTokenSigningAlgValuesSupported;
    await expect(() =>
      registerClient(getMockOptions(), mockIssuer)
    ).rejects.toThrow(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory."
    );
  });

  it("uses an access token if provided", async () => {
    const myFetch = getSuccessfulFetch();
    global.fetch = myFetch;
    const options = getMockOptions();
    options.registrationAccessToken = "some token";
    await registerClient(options, getMockIssuer());
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(myFetch.mock.calls[0][1]?.headers.Authorization).toEqual(
      "Bearer some token"
    );
  });

  it("extracts the client info from the IdP response", async () => {
    const myFetch = getSuccessfulFetch();
    global.fetch = myFetch;
    const client = await registerClient(getMockOptions(), getMockIssuer());
    expect(client.clientId).toEqual("some id");
    expect(client.clientSecret).toEqual("some secret");
    expect(client.idTokenSignedResponseAlg).toEqual("RS256");
  });

  // TODO: this only tests the minimal registration request.
  // The additional provided options will be tested in an upcoming PR.

  it("does not send a challenge method when performing DCR", async () => {
    const options = getMockOptions();
    const myFetch = getSuccessfulFetch() as jest.Mock<
      Promise<Response>,
      Parameters<typeof fetch>
    >;
    global.fetch = myFetch;

    await registerClient(options, getMockIssuer());

    expect(myFetch).toHaveBeenCalledWith(getMockIssuer().registrationEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_name: options.clientName,
        application_type: "web",
        redirect_uris: [options.redirectUrl?.toString()],
        subject_type: "pairwise",
        token_endpoint_auth_method: "client_secret_basic",
        id_token_signed_response_alg: "RS256",
      }),
    });
  });

  it("passes the specified redirection URL to the IdP", async () => {
    const options = getMockOptions();
    options.redirectUrl = "https://some.url";
    const myFetch = getSuccessfulFetch();
    global.fetch = myFetch;

    await registerClient(options, getMockIssuer());

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const rawBody = myFetch.mock.calls[0][1].body;
    const parsedBody = JSON.parse(rawBody);
    expect(parsedBody.redirect_uris).toEqual(["https://some.url"]);
  });

  it("throws if the IdP returns a mismatching redirect URL", async () => {
    const myFetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            // eslint-disable-next-line camelcase
            client_id: "some id",
            // eslint-disable-next-line camelcase
            client_secret: "some secret",
            // eslint-disable-next-line camelcase
            redirect_uris: ["https://some.other.url"],
          }),
          { status: 200 }
        )
    );
    global.fetch = myFetch;
    const options = getMockOptions();
    options.redirectUrl = "https://some.url";

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      'Dynamic client registration failed: the returned redirect URIs ["https://some.other.url"] don\'t match the provided ["https://some.url"]'
    );
  });

  it("throws if no client_id is returned", async () => {
    const myFetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            // eslint-disable-next-line camelcase
            some_key: "some value",
          }),
          { status: 200 }
        )
    );
    global.fetch = myFetch;
    const options = getMockOptions();

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      'Dynamic client registration failed: no client_id has been found on {"some_key":"some value"}'
    );
  });

  it("throws if the redirect URI is invalid", async () => {
    const myFetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "invalid_redirect_uri",
            // eslint-disable-next-line camelcase
            error_description: "some description",
          }),
          { status: 400 }
        )
    );
    global.fetch = myFetch;
    const options = getMockOptions();
    options.redirectUrl = "https://some.url";

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      "Dynamic client registration failed: the provided redirect uri [https://some.url] is invalid - some description"
    );
  });

  it("throws if the redirect URI is undefined", async () => {
    global.fetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "invalid_redirect_uri",
            // eslint-disable-next-line camelcase
            error_description: "some description",
          }),
          { status: 400 }
        )
    );
    const options = getMockOptions();

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      "Dynamic client registration failed: the provided redirect uri [undefined] is invalid - some description"
    );
    global.fetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "invalid_redirect_uri",
          }),
          { status: 400 }
        )
    );
    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      "Dynamic client registration failed: the provided redirect uri [undefined] is invalid - "
    );
  });

  it("throws if the client metadata are invalid", async () => {
    global.fetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "invalid_client_metadata",
            // eslint-disable-next-line camelcase
            error_description: "some description",
          }),
          { status: 400 }
        )
    );
    const options = getMockOptions();

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      'Dynamic client registration failed: the provided client metadata {"sessionId":"mySession"} is invalid - some description'
    );

    global.fetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "invalid_client_metadata",
          }),
          { status: 400 }
        )
    );
    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      'Dynamic client registration failed: the provided client metadata {"sessionId":"mySession"} is invalid - '
    );
  });

  it("throws if the IdP returns a custom error", async () => {
    global.fetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "custom_error",
            // eslint-disable-next-line camelcase
            error_description: "some description",
          }),
          { status: 400 }
        )
    );
    const options = getMockOptions();

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      "Dynamic client registration failed: custom_error - some description"
    );

    global.fetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            error: "custom_error",
          }),
          { status: 400 }
        )
    );
    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow("Dynamic client registration failed: custom_error - ");
  });

  it("throws without parsing the response body as JSON on non-400 error", async () => {
    const myFetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response("Resource not found", {
          status: 404,
          statusText: "Not found",
        })
    );
    global.fetch = myFetch;
    const options = getMockOptions();

    await expect(() =>
      registerClient(options, getMockIssuer())
    ).rejects.toThrow(
      "Dynamic client registration failed: the server returned 404 Not found - Resource not found"
    );
  });
});
