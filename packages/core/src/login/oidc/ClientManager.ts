/*
 * Copyright 2022 Inrupt Inc.
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

import type IStorageUtility from "../../storage/IStorageUtility";
import type ILoginOptions from "../ILoginOptions";
import {
  ClientType,
  IClient,
  isValidClient,
  PublicIdentifierClient,
  StaticClient,
} from "./IClient";
import type { IIssuerConfig } from "./IIssuerConfig";
import type { IDynamicClientRegistrar } from "./IDynamicClientRegistrar";
import type { IIssuerConfigFetcher } from "./IIssuerConfigFetcher";
import { isValidUrl } from "../../util/isValidUrl";

export function determineSigningAlg(
  supported: string[],
  preferred: string[]
): string | null {
  return (
    preferred.find((signingAlg) => {
      return supported.includes(signingAlg);
    }) ?? null
  );
}

export function negotiateClientSigningAlg(
  issuerConfig: IIssuerConfig,
  clientPreference: string[]
): string {
  if (!Array.isArray(issuerConfig.idTokenSigningAlgValuesSupported)) {
    throw new Error(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory."
    );
  }

  const signingAlg = determineSigningAlg(
    issuerConfig.idTokenSigningAlgValuesSupported,
    clientPreference
  );

  if (signingAlg === null) {
    throw new Error(
      `No signature algorithm match between ${JSON.stringify(
        issuerConfig.idTokenSigningAlgValuesSupported
      )} supported by the Identity Provider and ${JSON.stringify(
        clientPreference
      )} preferred by the client.`
    );
  }

  return signingAlg;
}

export function determineClientType(
  options: Partial<ILoginOptions>,
  issuerConfig: IIssuerConfig
): ClientType {
  if (options.clientId !== undefined && !isValidUrl(options.clientId)) {
    return "static";
  }
  if (
    issuerConfig.scopesSupported.includes("webid") &&
    options.clientId !== undefined &&
    isValidUrl(options.clientId)
  ) {
    return "solid-oidc";
  }
  // If no client_id is provided, the client must go through Dynamic Client Registration.
  // If a client_id is provided and it looks like a URI, yet the Identity Provider
  // does *not* support Solid-OIDC, then we also perform DCR (and discard the
  // provided client_id).
  return "dynamic";
}

export class ClientManager {
  constructor(
    private storageUtility: IStorageUtility,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private dynamicClientRegistrar: IDynamicClientRegistrar
  ) {}

  async get(issuer: string): Promise<IClient | null> {
    return await this.storageUtility.getClientDetails(issuer);
  }

  async register(
    issuer: string,
    // FIXME: make this a decent type:
    // static clients will never have a redirectUrl, others must have one.
    clientDetails: Omit<IClient, "clientType"> & { redirectUrl?: string }
  ): Promise<IClient> {
    const issuerConfig = await this.issuerConfigFetcher.fetchConfig(issuer);

    const clientType = determineClientType(clientDetails, issuerConfig);

    if (clientType === "dynamic") {
      const existingClient = await this.storageUtility.getClientDetails(issuer);

      // If we already have a client and its of the same type, then return it:
      if (existingClient && existingClient.clientType === clientType) {
        // TODO: do we care too much about clients changing name? Should we add a `isSameClient(clientA, clientB)`?
        return existingClient;
      } else {
        // Otherwise register a new client for the issuer:
        const dynamicClient = await this.dynamicClientRegistrar.register(
          {
            clientName: clientDetails.clientName,
            redirectUrl: clientDetails.redirectUrl,
          },
          issuerConfig
        );

        this.storageUtility.setClientDetails(issuer, dynamicClient);

        return dynamicClient;
      }
    }

    // This is a little hacky, and it'd be better to explicitly validate fields:
    const client = {
      clientType,
      ...clientDetails,
    };

    if (!isValidClient(client)) {
      throw new Error(
        `Missing or incorrect clientDetails supplied to ClientManager.register, received for ${clientType}: ${clientDetails}`
      );
    }

    this.storageUtility.setClientDetails(issuer, client);

    if (clientType === "solid-oidc") {
      return client as PublicIdentifierClient;
    } else {
      return client as StaticClient;
    }
  }
}
