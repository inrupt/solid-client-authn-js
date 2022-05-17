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

import { registerClient } from "@inrupt/oidc-client-ext";
import {
  IDynamicClientRegistrarOptions,
  IDynamicClientRegistrar,
  IClient,
  IIssuerConfig,
} from "@inrupt/solid-client-authn-core";

export class DynamicClientRegistrar implements IDynamicClientRegistrar {
  async register(
    options: IDynamicClientRegistrarOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient> {
    const registeredClient = await registerClient(options, issuerConfig);

    // Specifically convert to an IClient which is a DynamicClient, as to isolate from @inrupt/oidc-client-ext
    const client: IClient = {
      clientType: "dynamic",
      clientId: registeredClient.clientId,
      clientSecret: registeredClient.clientSecret,
      clientExpiresAt: registeredClient.clientExpiresAt,
    };

    if (registeredClient.clientName) {
      client.clientName = registeredClient.clientName;
    }

    if (registeredClient.idTokenSignedResponseAlg) {
      client.idTokenSignedResponseAlg =
        registeredClient.idTokenSignedResponseAlg;
    }

    return client;
  }
}
