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
  ISessionInfo,
  ISessionInternalInfo,
  ILoginOptions,
} from "@inrupt/solid-client-authn-core";
import {
  EVENTS,
  isValidRedirectUrl,
  ClientAuthentication as ClientAuthenticationBase,
  removeOpenIdParams,
} from "@inrupt/solid-client-authn-core";
import { normalizeCallbackUrl } from "@inrupt/oidc-client-ext";
import type { EventEmitter } from "events";

/**
 * @hidden
 */
export default class ClientAuthentication extends ClientAuthenticationBase {
  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (
    options: ILoginOptions,
    eventEmitter: EventEmitter,
  ): Promise<void> => {
    // In order to get a clean start, make sure that the session is logged out
    // on login.
    // But we may want to preserve our client application info, particularly if
    // we used Dynamic Client Registration to register (since we don't
    // necessarily want the user to have to register this app each time they
    // login).
    await this.sessionInfoManager.clear(options.sessionId);

    // In the case of the user hitting the 'back' button in their browser, they
    // could return to a previous redirect URL that contains OIDC params that
    // are now longer valid. To be safe, strip relevant params now.
    // If the user is providing a redirect IRI, it should not be modified, so
    // normalization only applies if we default to the current location (which is
    // a bad practice and should be discouraged).
    const redirectUrl =
      options.redirectUrl ?? normalizeCallbackUrl(window.location.href);
    if (!isValidRedirectUrl(redirectUrl)) {
      throw new Error(
        `${redirectUrl} is not a valid redirect URL, it is either a malformed IRI, includes a hash fragment, or reserved query parameters ('code' or 'state').`,
      );
    }
    await this.loginHandler.handle({
      ...options,
      redirectUrl,
      // If no clientName is provided, the clientId may be used instead.
      clientName: options.clientName ?? options.clientId,
      eventEmitter,
    });
  };

  // Collects session information from storage, and returns them. Returns null
  // if the expected information cannot be found.
  // Note that the ID token is not stored, which means the session information
  // cannot be validated at this point.
  validateCurrentSession = async (
    currentSessionId: string,
  ): Promise<(ISessionInfo & ISessionInternalInfo) | null> => {
    const sessionInfo = await this.sessionInfoManager.get(currentSessionId);
    if (
      sessionInfo === undefined ||
      sessionInfo.clientAppId === undefined ||
      sessionInfo.issuer === undefined
    ) {
      return null;
    }
    return sessionInfo;
  };

  handleIncomingRedirect = async (
    url: string,
    eventEmitter: EventEmitter,
  ): Promise<ISessionInfo | undefined> => {
    try {
      const redirectInfo = await this.redirectHandler.handle(url, eventEmitter);
      // The `FallbackRedirectHandler` directly returns the global `fetch` for
      // his value, so we should ensure it's bound to `window` rather than to
      // ClientAuthentication, to avoid the following error:
      // > 'fetch' called on an object that does not implement interface Window.
      this.fetch = redirectInfo.fetch.bind(window);
      this.boundLogout = redirectInfo.getLogoutUrl;

      // Strip the oauth params:
      await this.cleanUrlAfterRedirect(url);

      return {
        isLoggedIn: redirectInfo.isLoggedIn,
        webId: redirectInfo.webId,
        sessionId: redirectInfo.sessionId,
        expirationDate: redirectInfo.expirationDate,
      };
    } catch (err) {
      // Strip the oauth params:
      await this.cleanUrlAfterRedirect(url);

      // FIXME: EVENTS.ERROR should be errorCode, errorDescription
      //
      // I'm not sure if "redirect" is a good error code, and in theory `err`
      // maybe an Error object and not a string; Maybe we want to just hardcode
      // a description instead?
      eventEmitter.emit(EVENTS.ERROR, "redirect", err);

      return undefined;
    }
  };

  private async cleanUrlAfterRedirect(url: string): Promise<void> {
    const cleanedUpUrl = removeOpenIdParams(url).href;

    // Remove OAuth-specific query params (since the login flow finishes with
    // the browser being redirected back with OAuth2 query params (e.g. for
    // 'code' and 'state'), and so if the user simply refreshes this page our
    // authentication library will be called again with what are now invalid
    // query parameters!).
    window.history.replaceState(null, "", cleanedUpUrl);
    while (window.location.href !== cleanedUpUrl) {
      // Poll the current URL every ms. Active polling is required because
      // window.history.replaceState is asynchronous, but the associated
      // 'popstate' event which should be listened to is only sent on active
      // navigation, which we will not have here.
      // See https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event#when_popstate_is_sent
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1);
      });
    }
  }
}
