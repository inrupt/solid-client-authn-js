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

import type IStorageUtility from "../../storage/IStorageUtility";
import type ILoginOptions from "../ILoginOptions";
import type { IClient } from "./IClient";
import type { IIssuerConfig } from "./IIssuerConfig";

export interface IClientRegistrarOptions {
  sessionId: string;
  clientName?: string;
  redirectUrl?: string;
}

/**
 * @hidden
 */
export interface IClientRegistrar {
  getClient(
    options: IClientRegistrarOptions,
    issuerConfig: IIssuerConfig,
  ): Promise<IClient>;
}

function isValidUrl(url: string): boolean {
  try {
    // Here, the URL constructor is just called to parse the given string and
    // verify if it is a well-formed IRI.
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function determineSigningAlg(
  supported: string[],
  preferred: string[],
): string | null {
  return (
    preferred.find((signingAlg) => {
      return supported.includes(signingAlg);
    }) ?? null
  );
}

type StaticClientOptions = ILoginOptions & {
  clientId: string;
  clientSecret: string;
};

type SolidOidcClientOptions = ILoginOptions & {
  clientId: string;
  clientSecret: undefined;
};

function isStaticClient(
  options: ILoginOptions,
): options is StaticClientOptions {
  return options.clientId !== undefined && !isValidUrl(options.clientId);
}

function isSolidOidcClient(
  options: ILoginOptions,
  issuerConfig: IIssuerConfig,
): options is SolidOidcClientOptions {
  return (
    issuerConfig.scopesSupported.includes("webid") &&
    options.clientId !== undefined &&
    isValidUrl(options.clientId)
  );
}

export function isKnownClientType(
  clientType: string | undefined,
): clientType is "dynamic" | "static" | "solid-oidc" {
  return (
    typeof clientType === "string" &&
    ["dynamic", "static", "solid-oidc"].includes(clientType)
  );
}

export async function handleRegistration(
  options: ILoginOptions,
  issuerConfig: IIssuerConfig,
  storageUtility: IStorageUtility,
  clientRegistrar: IClientRegistrar,
): Promise<IClient> {
  let clientInfo: IClient;
  if (isSolidOidcClient(options, issuerConfig)) {
    clientInfo = {
      clientId: options.clientId,
      clientName: options.clientName,
      clientType: "solid-oidc",
    };
  } else if (isStaticClient(options)) {
    clientInfo = {
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientName,
      clientType: "static",
    };
  } else {
    // Case of a dynamically registered client.
    return clientRegistrar.getClient(
      {
        sessionId: options.sessionId,
        clientName: options.clientName,
        redirectUrl: options.redirectUrl,
      },
      issuerConfig,
    );
  }

  // If a client_id was provided, and the Identity Provider is Solid-OIDC compliant,
  // or it is not compliant but the client_id isn't an IRI (we assume it has already
  // been registered with the IdP), then the client registration information needs
  // to be stored so that it can be retrieved later after redirect.
  const infoToSave: Record<string, string> = {
    clientId: clientInfo.clientId,
    clientType: clientInfo.clientType,
  };
  if (clientInfo.clientType === "static") {
    infoToSave.clientSecret = clientInfo.clientSecret;
  }
  if (clientInfo.clientName) {
    infoToSave.clientName = clientInfo.clientName;
  }
  // Note that due to the underlying implementation, doing a `Promise.all`
  // on multiple `storageUtility.setForUser` results in the last one
  // overriding the previous calls.
  await storageUtility.setForUser(options.sessionId, infoToSave);
  return clientInfo;
}
