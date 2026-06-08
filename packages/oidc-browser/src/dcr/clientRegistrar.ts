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

/**
 * @hidden
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// MIGRATION: oauth4webapi + dpop — Phase 2 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Before: hand-built the RFC 7591 registration POST (JSON body), hand-parsed the
// response, and hand-validated `client_id` / `redirect_uris` with bespoke
// guards (`hasClientId`, `hasRedirectUri`, `processErrorResponse`).
//
// After: delegated to `oauth.dynamicClientRegistrationRequest` /
// `oauth.processDynamicClientRegistrationResponse`. oauth4webapi handles the
// request shaping and rejects OAuth-style error bodies
// (`ResponseBodyError`) for us. The redirect-URI sanity check and the
// inrupt-specific error messages are preserved as a thin post-validation layer.
//
// The exported `registerClient(options, issuerConfig)` signature and its
// returned `IOpenIdDynamicClient` shape are PRESERVED so `packages/browser`'s
// `ClientRegistrar` keeps compiling unchanged.
// ---------------------------------------------------------------------------

import type {
  IIssuerConfig,
  IOpenIdDynamicClient,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";
import {
  determineSigningAlg,
  PREFERRED_SIGNING_ALG,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";
import { asAuthorizationServer } from "../oauth/oauthAdapter";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

function processErrorResponse(
  responseBody: { error?: string; error_description?: string },
  options: IClientRegistrarOptions,
): never {
  // The following errors are defined by the spec, and allow providing some context.
  // See https://tools.ietf.org/html/rfc7591#section-3.2.2 for more information
  if (responseBody.error === "invalid_redirect_uri") {
    throw new Error(
      `Dynamic client registration failed: the provided redirect uri [${options.redirectUrl?.toString()}] is invalid - ${
        responseBody.error_description ?? ""
      }`,
    );
  }
  if (responseBody.error === "invalid_client_metadata") {
    throw new Error(
      `Dynamic client registration failed: the provided client metadata ${JSON.stringify(
        options,
      )} is invalid - ${responseBody.error_description ?? ""}`,
    );
  }
  // We currently don't support software statements, so no related error should happen.
  // If an error outside of the spec happens, no additional context can be provided
  throw new Error(
    `Dynamic client registration failed: ${responseBody.error} - ${
      responseBody.error_description ?? ""
    }`,
  );
}

function hasRedirectUri(body: unknown): body is { redirect_uris: string[] } {
  return (
    Array.isArray((body as Record<string, string[]>).redirect_uris) &&
    (body as Record<string, string[]>).redirect_uris.every(
      (uri) => typeof uri === "string",
    )
  );
}

function validateRegistrationResponse(
  responseBody: { client_id?: unknown } & Record<string, unknown>,
  options: IClientRegistrarOptions,
): asserts responseBody is { client_id: string } & Record<string, unknown> {
  if (typeof responseBody.client_id !== "string") {
    throw new Error(
      `Dynamic client registration failed: no client_id has been found on ${JSON.stringify(
        responseBody,
      )}`,
    );
  }
  if (
    options.redirectUrl &&
    hasRedirectUri(responseBody) &&
    responseBody.redirect_uris[0] !== options.redirectUrl.toString()
  ) {
    throw new Error(
      `Dynamic client registration failed: the returned redirect URIs ${JSON.stringify(
        responseBody.redirect_uris,
      )} don't match the provided ${JSON.stringify([
        options.redirectUrl.toString(),
      ])}`,
    );
  }
}

export async function registerClient(
  options: IClientRegistrarOptions,
  issuerConfig: IIssuerConfig,
): Promise<IOpenIdDynamicClient> {
  if (!issuerConfig.registrationEndpoint) {
    throw new Error(
      "Dynamic Registration could not be completed because the issuer has no registration endpoint.",
    );
  }
  if (!Array.isArray(issuerConfig.idTokenSigningAlgValuesSupported)) {
    throw new Error(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory.",
    );
  }

  const signingAlg = determineSigningAlg(
    issuerConfig.idTokenSigningAlgValuesSupported,
    PREFERRED_SIGNING_ALG,
  );

  const as = asAuthorizationServer(issuerConfig);

  // Same client metadata as the legacy hand-built JSON body.
  // (Matches the `Partial<OmitSymbolProperties<Client>>` param of
  // `dynamicClientRegistrationRequest`.)
  const clientMetadata: Partial<oauth.OmitSymbolProperties<oauth.Client>> = {
    client_name: options.clientName,
    application_type: "web",
    redirect_uris: [options.redirectUrl?.toString() as string],
    subject_type: "public",
    token_endpoint_auth_method: "client_secret_basic",
    id_token_signed_response_alg: signingAlg ?? undefined,
    grant_types: ["authorization_code", "refresh_token"],
  };

  let registered: oauth.OmitSymbolProperties<oauth.Client>;
  try {
    const registerResponse = await oauth.dynamicClientRegistrationRequest(
      as,
      clientMetadata,
    );
    registered =
      await oauth.processDynamicClientRegistrationResponse(registerResponse);
  } catch (err) {
    // oauth4webapi rejects RFC 7591 error bodies with `ResponseBodyError`,
    // carrying `.error` / `.error_description`. Reshape into inrupt's
    // contextual error messages (`invalid_redirect_uri` / `invalid_client_metadata`).
    if (err instanceof oauth.ResponseBodyError) {
      return processErrorResponse(
        {
          error: err.error,
          error_description: err.error_description ?? undefined,
        },
        options,
      );
    }
    throw err;
  }

  validateRegistrationResponse(registered, options);

  return {
    clientId: registered.client_id,
    clientSecret: registered.client_secret as string | undefined,
    expiresAt: registered.client_secret_expires_at as number | undefined,
    idTokenSignedResponseAlg: registered.id_token_signed_response_alg as
      | string
      | undefined,
    clientType: "dynamic",
  } as IOpenIdDynamicClient;
}
