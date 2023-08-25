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

import {
  isValidRedirectUrl,
  ClientAuthentication as ClientAuthenticationBase,
} from "@inrupt/solid-client-authn-core";
import type {
  ILoginInputOptions,
  ISessionInfo,
} from "@inrupt/solid-client-authn-core";
import type { EventEmitter } from "events";

/**
 * @hidden
 */
export default class ClientAuthentication extends ClientAuthenticationBase {
  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (
    sessionId: string,
    options: ILoginInputOptions,
    eventEmitter: EventEmitter,
  ): Promise<ISessionInfo | undefined> => {
    // Keep track of the session ID
    await this.sessionInfoManager.register(sessionId);
    if (
      typeof options.redirectUrl === "string" &&
      !isValidRedirectUrl(options.redirectUrl)
    ) {
      throw new Error(
        `${options.redirectUrl} is not a valid redirect URL, it is either a malformed IRI, includes a hash fragment, or reserved query parameters ('code' or 'state').`,
      );
    }
    const loginReturn = await this.loginHandler.handle({
      sessionId,
      oidcIssuer: options.oidcIssuer,
      redirectUrl: options.redirectUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientName ?? options.clientId,
      refreshToken: options.refreshToken,
      handleRedirect: options.handleRedirect,
      // Defaults to DPoP
      tokenType: options.tokenType ?? "DPoP",
      eventEmitter,
    });

    if (loginReturn !== undefined) {
      this.fetch = loginReturn.fetch;
      return loginReturn;
    }

    // undefined is returned in the case when the login must be completed
    // after redirect.
    return undefined;
  };

  getSessionIdAll = async (): Promise<string[]> => {
    return this.sessionInfoManager.getRegisteredSessionIdAll();
  };

  registerSession = async (sessionId: string): Promise<void> => {
    return this.sessionInfoManager.register(sessionId);
  };

  clearSessionAll = async (): Promise<void> => {
    return this.sessionInfoManager.clearAll();
  };

  handleIncomingRedirect = async (
    url: string,
    eventEmitter: EventEmitter,
  ): Promise<ISessionInfo | undefined> => {
    const redirectInfo = await this.redirectHandler.handle(url, eventEmitter);

    this.fetch = redirectInfo.fetch;
    this.boundLogout = redirectInfo.getLogoutUrl;

    return {
      isLoggedIn: redirectInfo.isLoggedIn,
      webId: redirectInfo.webId,
      sessionId: redirectInfo.sessionId,
    };
  };
}
