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

/**
 * @hidden
 * @packageDocumentation
 */

import {
  determineSigningAlg,
  PREFERRED_SIGNING_ALG,
} from "../common/negotiation";
import {
  IIssuerConfig,
  IClient,
  IClientRegistrarOptions,
} from "../common/types";

function processErrorResponse(
  // The type is any here because the object is parsed from a JSON response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseBody: any,
  options: IClientRegistrarOptions
): void {
  // The following errors are defined by the spec, and allow providing some context.
  // See https://tools.ietf.org/html/rfc7591#section-3.2.2 for more information
  if (responseBody.error === "invalid_redirect_uri") {
    throw new Error(
      `Dynamic client registration failed: the provided redirect uri [${options.redirectUrl?.toString()}] is invalid - ${
        responseBody.error_description ?? ""
      }`
    );
  }
  if (responseBody.error === "invalid_client_metadata") {
    throw new Error(
      `Dynamic client registration failed: the provided client metadata ${JSON.stringify(
        options
      )} is invalid - ${responseBody.error_description ?? ""}`
    );
  }
  // We currently don't support software statements, so no related error should happen.
  // If an error outside of the spec happens, no additional context can be provided
  throw new Error(
    `Dynamic client registration failed: ${responseBody.error} - ${
      responseBody.error_description ?? ""
    }`
  );
}

function validateRegistrationResponse(
  // The type is any here because the object is parsed from a JSON response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseBody: any,
  options: IClientRegistrarOptions
): void {
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
}

export async function registerClient(
  options: IClientRegistrarOptions,
  issuerConfig: IIssuerConfig
): Promise<IClient> {
  if (!issuerConfig.registrationEndpoint) {
    throw new Error(
      "Dynamic Registration could not be completed because the issuer has no registration endpoint."
    );
  }
  if (!issuerConfig.idTokenSigningAlgValuesSupported) {
    throw new Error(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory."
    );
  }

  const signingAlg = determineSigningAlg(
    issuerConfig.idTokenSigningAlgValuesSupported,
    PREFERRED_SIGNING_ALG
  );

  const config = {
    /* eslint-disable camelcase */
    client_name: options.clientName,
    application_type: "web",
    redirect_uris: [options.redirectUrl?.toString()],
    subject_type: "pairwise",
    token_endpoint_auth_method: "client_secret_basic",
    id_token_signed_response_alg: signingAlg,
    /* eslint-enable camelcase */
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.registrationAccessToken) {
    headers.Authorization = `Bearer ${options.registrationAccessToken}`;
  }
  const registerResponse = await fetch(
    issuerConfig.registrationEndpoint.toString(),
    {
      method: "POST",
      headers,
      body: JSON.stringify(config),
    }
  );
  if (registerResponse.ok) {
    const responseBody = await registerResponse.json();
    validateRegistrationResponse(responseBody, options);
    return {
      clientId: responseBody.client_id,
      clientSecret: responseBody.client_secret,
      idTokenSignedResponseAlg: responseBody.id_token_signed_response_alg,
    };
  }
  if (registerResponse.status === 400) {
    processErrorResponse(await registerResponse.json(), options);
  }
  throw new Error(
    `Dynamic client registration failed: the server returned ${
      registerResponse.status
    } ${registerResponse.statusText} - ${await registerResponse.text()}`
  );
}
