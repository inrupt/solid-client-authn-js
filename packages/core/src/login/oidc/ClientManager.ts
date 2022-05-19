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
import type { ClientType, IClient } from "./IClient";
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

export async function handleRegistration(...args: any[]) {}

//   options: IDynamicClientRegistrarOptions,
//   issuerConfig: IIssuerConfig,
//   storageUtility: IStorageUtility,
//   clientRegistrar: IDynamicClientRegistrar
// ): Promise<IClient> {
//   const clientType = determineClientType(options, issuerConfig);
//   if (clientType === "dynamic") {
//     return clientRegistrar.getClient(
//       {
//         sessionId: options.sessionId,
//         clientName: options.clientName,
//         redirectUrl: options.redirectUrl,
//       },
//       issuerConfig
//     );
//   }

//   await storageUtility.setClientDetails(issuerConfig.issuer, {});
//   // If a client_id was provided, and the Identity Provider is Solid-OIDC compliant,
//   // or it is not compliant but the client_id isn't an IRI (we assume it has already
//   // been registered with the IdP), then the client registration information needs
//   // to be stored so that it can be retrieved later after redirect.
//   await storageUtility.setForUser(options.sessionId, {
//     // If the client is either static or solid-oidc compliant, its client ID cannot be undefined.
//     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//     clientId: options.clientId!,
//   });
//   if (options.clientSecret) {
//     await storageUtility.setForUser(options.sessionId, {
//       clientSecret: options.clientSecret,
//     });
//   }
//   if (options.clientName) {
//     await storageUtility.setForUser(options.sessionId, {
//       clientName: options.clientName,
//     });
//   }
//   return {
//     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//     clientId: options.clientId!,
//     clientSecret: options.clientSecret,
//     clientName: options.clientName,
//     clientType,
//   };
// }

export async function getClient(
  issuerConfig: IIssuerConfig,
  storageUtility: IStorageUtility
): Promise<IClient | null> {
  const storedClient = await storageUtility.getClientDetails(
    issuerConfig.issuer
  );

  if (storedClient === null) {
    return null;
  }

  // Should this be in `isValidClient`?
  if (
    storedClient.clientType === "dynamic" &&
    storedClient.clientExpiresAt !== 0 &&
    storedClient.clientExpiresAt < Date.now()
  ) {
    return null;
  }

  return storedClient;
}

export class ClientManager {
  constructor(
    private storageUtility: IStorageUtility,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private dynamicClientRegistrar: IDynamicClientRegistrar
  ) {}

  async get(issuer: string): Promise<IClient | null> {
    const storedClient = await this.storageUtility.getClientDetails(issuer);

    if (storedClient === null) {
      return null;
    }

    // Should this be in `isValidClient`?
    if (
      storedClient.clientType === "dynamic" &&
      storedClient.clientExpiresAt !== 0 &&
      storedClient.clientExpiresAt < Date.now()
    ) {
      return null;
    }

    return storedClient;
  }

  async register(
    issuer: string,
    clientDetails: Omit<IClient, "clientType">
    // FIXME: just return IClient
  ): Promise<IClient | void> {
    const issuerConfig: IIssuerConfig =
      await this.issuerConfigFetcher.fetchConfig(issuer);

    const clientType = determineClientType(clientDetails, issuerConfig);

    if (clientType === "dynamic") {
      this.dynamicClientRegistrar.register(
        {
          clientName: clientDetails.clientName,
        },
        issuerConfig
      );
    }
  }
}
