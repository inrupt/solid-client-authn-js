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

import { it, describe } from "@jest/globals";
import {
  IIssuerConfig,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";
import URL from "url-parse";
import { registerClient } from "./clientRegistrar";
import { Response } from "cross-fetch";

const getMockIssuer = (): IIssuerConfig => {
  return {
    issuer: new URL("https://some.issuer"),
    authorizationEndpoint: new URL("https://some.issuer/autorization"),
    tokenEndpoint: new URL("https://some.issuer/token"),
    jwksUri: new URL("https://some.issuer/keys"),
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public", "pairwise"],
    registrationEndpoint: new URL("https://some.issuer/registration"),
  };
};

const getMockOptions = (): IClientRegistrarOptions => {
  return {
    sessionId: "mySession",
  };
};

const getSuccessfulFetch = (): typeof fetch =>
  jest.fn(
    async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
      new Response(
        JSON.stringify({
          // eslint-disable-next-line @typescript-eslint/camelcase
          client_id: "some id",
          // eslint-disable-next-line @typescript-eslint/camelcase
          client_secret: "some secret",
          // eslint-disable-next-line @typescript-eslint/camelcase
          redirect_uris: ["https://some.url"],
        }),
        { status: 200 }
      )
  );

const getFailedFetch = (): typeof fetch =>
  jest.fn(
    async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
      new Response(undefined, { status: 400 })
  );

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

  it("Throws if the Identity provider returns an invalid response", async () => {
    global.fetch = getFailedFetch();
    await expect(() =>
      registerClient(getMockOptions(), getMockIssuer())
    ).rejects.toThrow("Login Registration Error:");
    global.fetch = getSuccessfulFetch();
  });

  it("uses an access token if provided", async () => {
    const myFetch = getSuccessfulFetch();
    global.fetch = myFetch;
    const options = getMockOptions();
    options.registrationAccessToken = "some token";
    await registerClient(options, getMockIssuer());
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    expect(myFetch.mock.calls[0][1]?.headers["Authorization"]).toEqual(
      "Bearer some token"
    );
  });

  it("extract the client info from the IdP response", async () => {
    const client = await registerClient(getMockOptions(), getMockIssuer());
    expect(client.clientId).toEqual("some id");
    expect(client.clientSecret).toEqual("some secret");
  });

  // TODO: this only tests the minimal registration request.
  // The additional provided options will be tested in an upcoming PR.

  it("passes the specified redirection URL to the IdP", async () => {
    const options = getMockOptions();
    options.redirectUrl = new URL("https://some.url");
    const myFetch = getSuccessfulFetch();
    global.fetch = myFetch;

    await registerClient(options, getMockIssuer());

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    const rawBody = myFetch.mock.calls[0][1].body;
    const parsedBody = JSON.parse(rawBody);
    expect(parsedBody["redirect_uris"]).toEqual(["https://some.url"]);
  });

  it("throws if the IdP returns a mismatching redirect URL", async () => {
    const myFetch = jest.fn(
      async (_input: RequestInfo, _init?: RequestInit): Promise<Response> =>
        new Response(
          JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/camelcase
            client_id: "some id",
            // eslint-disable-next-line @typescript-eslint/camelcase
            client_secret: "some secret",
            // eslint-disable-next-line @typescript-eslint/camelcase
            redirect_uris: ["https://some.other.url"],
          }),
          { status: 200 }
        )
    );
    global.fetch = myFetch;
    const options = getMockOptions();
    options.redirectUrl = new URL("https://some.url");

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
            // eslint-disable-next-line @typescript-eslint/camelcase
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
});
