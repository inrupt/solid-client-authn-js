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

/**
 * @hidden
 * @packageDocumentation
 */

import type {
  IStorageUtility,
  IClientRegistrar,
  IIssuerConfig,
  IClient,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";
import {
  ConfigurationError,
  determineSigningAlg,
  PREFERRED_SIGNING_ALG,
} from "@inrupt/solid-client-authn-core";
import type { Client } from "openid-client";
import { Issuer } from "openid-client";
import { configToIssuerMetadata } from "./IssuerConfigFetcher";

export function negotiateClientSigningAlg(
  issuerConfig: IIssuerConfig,
  clientPreference: string[],
): string {
  if (!Array.isArray(issuerConfig.idTokenSigningAlgValuesSupported)) {
    throw new Error(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory.",
    );
  }

  const signingAlg = determineSigningAlg(
    issuerConfig.idTokenSigningAlgValuesSupported,
    clientPreference,
  );

  if (signingAlg === null) {
    throw new Error(
      `No signature algorithm match between ${JSON.stringify(
        issuerConfig.idTokenSigningAlgValuesSupported,
      )} supported by the Identity Provider and ${JSON.stringify(
        clientPreference,
      )} preferred by the client.`,
    );
  }

  return signingAlg;
}

/**
 * @hidden
 */
export default class ClientRegistrar implements IClientRegistrar {
  constructor(private storageUtility: IStorageUtility) {
    this.storageUtility = storageUtility;
  }

  async getClient(
    options: IClientRegistrarOptions,
    issuerConfig: IIssuerConfig,
  ): Promise<IClient> {
    // If client secret and/or client id are stored in storage, use those.
    const [
      storedClientId,
      storedClientSecret,
      storedClientName,
      storedIdTokenSignedResponseAlg,
    ] = await Promise.all([
      this.storageUtility.getForUser(options.sessionId, "clientId"),
      this.storageUtility.getForUser(options.sessionId, "clientSecret"),
      this.storageUtility.getForUser(options.sessionId, "clientName"),
      this.storageUtility.getForUser(
        options.sessionId,
        "idTokenSignedResponseAlg",
      ),
    ]);
    if (storedClientId) {
      return {
        clientId: storedClientId,
        clientSecret: storedClientSecret,
        clientName: storedClientName as string | undefined,
        idTokenSignedResponseAlg:
          storedIdTokenSignedResponseAlg ??
          negotiateClientSigningAlg(issuerConfig, PREFERRED_SIGNING_ALG),
        clientType: "dynamic",
      };
    }

    // TODO: It would be more efficient to only issue a single request (see IssuerConfigFetcher)
    const issuer = new Issuer(configToIssuerMetadata(issuerConfig));

    if (issuer.metadata.registration_endpoint === undefined) {
      throw new ConfigurationError(
        `Dynamic client registration cannot be performed, because issuer does not have a registration endpoint: ${JSON.stringify(
          issuer.metadata,
        )}`,
      );
    }

    const signingAlg = negotiateClientSigningAlg(
      issuerConfig,
      PREFERRED_SIGNING_ALG,
    );

    // The following is compliant with the example code, but seems to mismatch the
    // type annotations.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const registeredClient: Client = await issuer.Client.register({
      redirect_uris: [options.redirectUrl],
      client_name: options.clientName,
      // See https://openid.net/specs/openid-connect-registration-1_0.html
      id_token_signed_response_alg: signingAlg,
      grant_types: ["authorization_code", "refresh_token"],
    });

    const infoToSave: Record<string, string> = {
      clientId: registeredClient.metadata.client_id,
      idTokenSignedResponseAlg:
        registeredClient.metadata.id_token_signed_response_alg ?? signingAlg,
    };
    if (registeredClient.metadata.client_secret) {
      infoToSave.clientSecret = registeredClient.metadata.client_secret;
    }
    await this.storageUtility.setForUser(options.sessionId, infoToSave);
    return {
      clientId: registeredClient.metadata.client_id,
      clientSecret: registeredClient.metadata.client_secret,
      clientName: registeredClient.metadata.client_name as string | undefined,
      idTokenSignedResponseAlg:
        registeredClient.metadata.id_token_signed_response_alg ?? signingAlg,
      clientType: "dynamic",
    };
  }
}
