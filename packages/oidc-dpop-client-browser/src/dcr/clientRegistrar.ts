import IIssuerConfig from "../IIssuerConfig";
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

import { IClient } from "./IClient";
import { IClientRegistrarOptions } from "./IClientRegistrar";

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
  return {
    clientId: responseBody.client_id,
    clientSecret: responseBody.client_secret,
  };
}

export { IClient, IClientRegistrarOptions };

// export async function getClient(
//     options: IClientRegistrarOptions,
//     issuerConfig: IIssuerConfig,
//     storage?: typeof window.localStorage
//   ): Promise<IClient> {
//     // If client secret and/or client id are in options, use those.
//     if (options.clientId) {
//       return {
//         clientId: options.clientId,
//         clientSecret: options.clientSecret,
//         clientName: options.clientName,
//       };
//     }

//     // If client secret and/or client id are stored in storage, use those.
//     const [
//       storedClientId,
//       storedClientSecret,
//       storedClientName,
//     ] = await Promise.all([
//       this.storageUtility.getForUser(options.sessionId, "clientId", {
//         // FIXME: figure out how to persist secure storage at reload
//         secure: false,
//       }),
//       this.storageUtility.getForUser(options.sessionId, "clientSecret", {
//         // FIXME: figure out how to persist secure storage at reload
//         secure: false,
//       }),
//       this.storageUtility.getForUser(options.sessionId, "clientName", {
//         secure: false,
//       }),
//     ]);

//     if (storedClientId) {
//       return {
//         clientId: storedClientId,
//         clientSecret: storedClientSecret,
//         clientName: storedClientName,
//       };
//     }

//     // If registration access token is stored, use that.
//     const [registrationAccessToken, registrationClientUri] = await Promise.all([
//       this.storageUtility.getForUser(
//         options.sessionId,
//         "registrationAccessToken"
//       ),
//       this.storageUtility.getForUser(
//         options.sessionId,
//         "registrationClientUri"
//       ),
//     ]);

//     let registerResponse: Response;
//     if (registrationAccessToken && registrationClientUri) {
//       registerResponse = await this.fetcher.fetch(registrationClientUri, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//           Authorization: `Bearer ${registrationAccessToken}`,
//         },
//       });
//     } else {
//       // Else, begin the dynamic registration.

//     // Save info
//     await this.storageUtility.setForUser(
//       options.sessionId,
//       {
//         clientId: responseBody.client_id,
//         clientSecret: responseBody.client_secret,
//       },
//       {
//         // FIXME: figure out how to persist secure storage at reload
//         // Otherwise, the client info cannot be retrieved from storage, and
//         // the lib tries to re-register the client on each fetch
//         secure: false,
//       }
//     );

//     await this.storageUtility.setForUser(options.sessionId, {
//       registrationAccessToken: responseBody.registration_access_token,
//       registrationClientUri: responseBody.registration_client_uri,
//     });
//   }
// }
