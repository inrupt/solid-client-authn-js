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

import type { IIssuerConfig, KeyPair } from "@inrupt/solid-client-authn-core";
import { PREFERRED_SIGNING_ALG } from "@inrupt/solid-client-authn-core";
import type { DPoPHandle } from "openid-client";
import {
  allowInsecureRequests,
  ClientSecretBasic,
  Configuration,
  getDPoPHandle,
  None,
} from "openid-client";
import type { CryptoKey } from "jose";
import { importJWK } from "jose";
import { configToIssuerMetadata } from "./IssuerConfigFetcher";
import { isLoopbackHttpUrl } from "../../util/isLoopbackHttpUrl";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

/**
 * Builds an openid-client {@link Configuration} from the issuer configuration
 * and client information known to the library.
 *
 * @param issuerConfig the OpenID Provider configuration.
 * @param client the client identifier, its (optional) secret, and the
 * algorithm the OpenID Provider is expected to use to sign ID Tokens. If no
 * algorithm is provided, openid-client defaults to RS256.
 * @returns an openid-client configuration.
 * @hidden
 */
export function buildClientConfiguration(
  issuerConfig: IIssuerConfig,
  client: {
    clientId: string;
    clientSecret?: string;
    idTokenSignedResponseAlg?: string;
  },
): Configuration {
  const config = new Configuration(
    configToIssuerMetadata(issuerConfig),
    client.clientId,
    {
      id_token_signed_response_alg: client.idTokenSignedResponseAlg,
    },
    typeof client.clientSecret === "string"
      ? ClientSecretBasic(client.clientSecret)
      : None(),
  );
  if (isLoopbackHttpUrl(issuerConfig.issuer)) {
    allowInsecureRequests(config);
  }
  return config;
}

/**
 * Builds an openid-client DPoP handle from a DPoP key pair, so that requests
 * to the token endpoint are DPoP-bound to that key.
 *
 * @param config the openid-client configuration.
 * @param dpopKey the DPoP key pair. The public key is stored as a JWK.
 * @returns a DPoP handle, or undefined if no key is provided.
 * @hidden
 */
export async function buildDpopHandle(
  config: Configuration,
  dpopKey: KeyPair | undefined,
): Promise<DPoPHandle | undefined> {
  if (dpopKey === undefined) {
    return undefined;
  }
  const publicKey = (await importJWK(
    dpopKey.publicKey,
    dpopKey.publicKey.alg ?? PREFERRED_SIGNING_ALG[0],
    { extractable: true },
  )) as CryptoKey;
  return getDPoPHandle(config, {
    privateKey: dpopKey.privateKey,
    publicKey,
  });
}
