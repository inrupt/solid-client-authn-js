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

import IStorageUtility from "../../storage/IStorageUtility";
import ILoginOptions from "../ILoginOptions";
import { IClient } from "./IClient";
import { IIssuerConfig } from "./IIssuerConfig";

export interface IClientRegistrarOptions {
  sessionId: string;
  clientName?: string;
  redirectUrl?: string;
  registrationAccessToken?: string;
}

/**
 * @hidden
 */
export interface IClientRegistrar {
  getClient(
    options: IClientRegistrarOptions,
    issuerConfig: IIssuerConfig
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
  preferred: string[]
): string | null {
  let preferredSupportedAlg = null;
  preferred.some((signingAlg) => {
    if (supported.includes(signingAlg)) {
      preferredSupportedAlg = signingAlg;
      // returnning true breaks the .some() iteration.
      return true;
    }
    return false;
  });
  return preferredSupportedAlg;
}

export async function handleRegistration(
  options: ILoginOptions,
  issuerConfig: IIssuerConfig,
  storageUtility: IStorageUtility,
  clientRegistrar: IClientRegistrar
): Promise<IClient> {
  if (
    options.clientId === undefined ||
    (issuerConfig.solidOidcSupported !==
      "https://solidproject.org/TR/solid-oidc" &&
      isValidUrl(options.clientId))
  ) {
    // If no client_id is provided, the client must go through DCR.
    // If a client_id is provided and it looks like a URI, yet the Identity Provider
    // does *not* support Solid-OIDC, then we also perform DCR (and discard the
    // provided client_id).
    return clientRegistrar.getClient(
      {
        sessionId: options.sessionId,
        clientName: options.clientName,
        redirectUrl: options.redirectUrl,
      },
      issuerConfig
    );
  }
  // If a client_id was provided, and the Identity Provider is Solid-OIDC compliant,
  // or it is not compliant but the client_id isn't an IRI (we assume it has already
  // been registered with the IdP), then the client registration information needs
  // to be stored so that it can be retrieved later after redirect.
  await storageUtility.setForUser(options.sessionId, {
    clientId: options.clientId,
  });
  if (options.clientSecret) {
    await storageUtility.setForUser(options.sessionId, {
      clientSecret: options.clientSecret,
    });
  }
  if (options.clientName) {
    await storageUtility.setForUser(options.sessionId, {
      clientName: options.clientName,
    });
  }
  return {
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    clientName: options.clientName,
  };
}
