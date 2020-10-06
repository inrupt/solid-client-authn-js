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

/**
 * @hidden
 * @packageDocumentation
 */

import {
  IIssuerConfig,
  IClient,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";

export async function registerClient(
  options: IClientRegistrarOptions,
  issuerConfig: IIssuerConfig
): Promise<IClient> {
  const config = {
    /* eslint-disable @typescript-eslint/camelcase */
    client_name: options.clientName,
    application_type: "web",
    redirect_uris: [options.redirectUrl?.toString()],
    subject_type: "pairwise",
    token_endpoint_auth_method: "client_secret_basic",
    code_challenge_method: "S256",
    /* eslint-enable @typescript-eslint/camelcase */
  };
  if (!issuerConfig.registrationEndpoint) {
    throw new Error(
      "Dynamic Registration could not be completed because the issuer has no registration endpoint."
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.registrationAccessToken) {
    headers["Authorization"] = `Bearer ${options.registrationAccessToken}`;
  }
  const registerResponse = await window.fetch(
    issuerConfig.registrationEndpoint.toString(),
    {
      method: "POST",
      headers,
      body: JSON.stringify(config),
    }
  );
  if (!registerResponse.ok) {
    throw new Error(
      `Login Registration Error: [${await registerResponse.text()}]`
    );
  }
  const responseBody = await registerResponse.json();
  if (responseBody.client_id === undefined) {
    throw new Error(
      `Dynamic client registration failed: no client_id has been found on ${JSON.stringify(
        responseBody
      )}`
    );
  }
  if (
    options.redirectUrl &&
    (responseBody.redirect_uris === undefined ||
      responseBody.redirect_uris[0] !== options.redirectUrl.toString())
  ) {
    throw new Error(
      `Dynamic client registration failed: the returned redirect URIs ${JSON.stringify(
        responseBody.redirect_uris
      )} don't match the provided ${JSON.stringify([
        options.redirectUrl.toString(),
      ])}`
    );
  }
  return {
    clientId: responseBody.client_id,
    clientSecret: responseBody.client_secret,
  };
}
