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
 */
import { EventEmitter } from "events";
import {
  ILoginInputOptions,
  ISessionInfo,
  IStorage,
} from "@inrupt/solid-client-authn-core";
import { v4 } from "uuid";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { KEY_CURRENT_SESSION, KEY_CURRENT_URL } from "./constant";

export interface ISessionOptions {
  /**
   * A private storage, unreachable to other scripts on the page. Typically in-memory.
   */
  secureStorage: IStorage;
  /**
   * A storage where non-sensitive information may be stored, potentially longer-lived than the secure storage.
   */
  insecureStorage: IStorage;
  /**
   * Details about the current session
   */
  sessionInfo: ISessionInfo;
  /**
   * An instance of the library core. Typically obtained using `getClientAuthenticationWithDependencies`.
   */
  clientAuthentication: ClientAuthentication;
}

async function silentlyAuthenticate(
  sessionId: string,
  clientAuthn: ClientAuthentication
) {
  // Check if we have an ID Token in storage - if we do then we may be
  // currently logged in, and the user has refreshed their browser page. In
  // this case, it can be really useful to save the user's current browser
  // location, so that we can restore that location after we complete the
  // entire re-login-the-user-silently-flow (e.g., if the user was on a
  // specific 'page' of a Single Page App, then presumably they'll expect to
  // be brought back to exactly that same 'page' after the full refresh).
  const storedSessionInfo = await clientAuthn.getSessionInfo(sessionId);
  if (
    storedSessionInfo === undefined ||
    storedSessionInfo.idToken === undefined
  ) {
    return;
  }
  window.localStorage.setItem(KEY_CURRENT_URL, window.location.href);
  const issuer = await clientAuthn.getCurrentIssuer();
  if (issuer !== null) {
    await clientAuthn.login(sessionId, {
      prompt: "none",
      oidcIssuer: issuer,
      redirectUrl: storedSessionInfo.redirectUrl,
      clientId: storedSessionInfo.clientAppId,
      clientSecret: storedSessionInfo.clientAppSecret,
    });
  }
}

/**
 * A {@link Session} object represents a user's session on an application. The session holds state, as it stores information enabling acces to private resources after login for instance.
 */
export class Session extends EventEmitter {
  /**
   * Information regarding the current session.
   */
  public readonly info: ISessionInfo;

  private clientAuthentication: ClientAuthentication;

  private tokenRequestInProgress = false;

  /**
   * Session object constructor. Typically called as follows:
   *
   * ```typescript
   * const session = new Session();
   * ```
   *
   * See also [getDefaultSession](https://docs.inrupt.com/developer-tools/api/javascript/solid-client-authn-browser/functions.html#getdefaultsession).
   *
   * @param sessionOptions The options enabling the correct instantiation of
   * the session. Either both storages or clientAuthentication are required. For
   * more information, see {@link ISessionOptions}.
   * @param sessionId A string uniquely identifying the session.
   *
   */
  constructor(
    sessionOptions: Partial<ISessionOptions> = {},
    sessionId?: string
  ) {
    super();

    if (sessionOptions.clientAuthentication) {
      this.clientAuthentication = sessionOptions.clientAuthentication;
    } else if (sessionOptions.secureStorage && sessionOptions.insecureStorage) {
      this.clientAuthentication = getClientAuthenticationWithDependencies({
        secureStorage: sessionOptions.secureStorage,
        insecureStorage: sessionOptions.insecureStorage,
      });
    } else {
      this.clientAuthentication = getClientAuthenticationWithDependencies({});
    }

    if (sessionOptions.sessionInfo) {
      this.info = {
        sessionId: sessionOptions.sessionInfo.sessionId,
        isLoggedIn: false,
        webId: sessionOptions.sessionInfo.webId,
      };
    } else {
      this.info = {
        sessionId: sessionId ?? v4(),
        isLoggedIn: false,
      };
    }
  }

  /**
   * Triggers the login process. Note that this method will redirect the user away from your app.
   *
   * @param options Parameter to customize the login behaviour. In particular, two options are mandatory: `options.oidcIssuer`, the user's identity provider, and `options.redirectUrl`, the URL to which the user will be redirected after logging in their identity provider.
   * @returns This method should redirect the user away from the app: it does not return anything. The login process is completed by {@linkcode handleIncomingRedirect}.
   */
  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (options: ILoginInputOptions): Promise<void> => {
    await this.clientAuthentication.login(this.info.sessionId, {
      ...options,
    });
  };

  /**
   * Fetches data using available login information. If the user is not logged in, this will behave as a regular `fetch`. The signature of this method is identical to the [canonical `fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
   *
   * @param url The URL from which data should be fetched.
   * @param init Optional parameters customizing the request, by specifying an HTTP method, headers, a body, etc. Follows the [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/).
   */
  fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return this.clientAuthentication.fetch(url, init);
  };

  /**
   * Logs the user out of the application. This does not log the user out of their Solid identity provider, and should not redirect the user away.
   */
  logout = async (): Promise<void> => {
    await this.clientAuthentication.logout(this.info.sessionId);
    this.info.isLoggedIn = false;
    this.emit("logout");
  };

  fireSessionRestoreEvent = (): void => {
    const storedCurrentUrl = localStorage.getItem(KEY_CURRENT_URL);
    this.emit("sessionRestore", storedCurrentUrl);
  };

  /**
   * Completes the login process by processing the information provided by the
   * Solid identity provider through redirect.
   *
   * @param url The URL of the page handling the redirect, including the query
   * parameters — these contain the information to process the login.
   * Note: as a convenience, if no URL value is specified here, we default to
   * using the browser's current location.
   */
  handleIncomingRedirect = async (
    url: string = window.location.href
  ): Promise<ISessionInfo | undefined> => {
    if (this.info.isLoggedIn) {
      this.fireSessionRestoreEvent();
      return this.info;
    }

    if (this.tokenRequestInProgress) {
      return undefined;
    }

    this.tokenRequestInProgress = true;
    const sessionInfo = await this.clientAuthentication.handleIncomingRedirect(
      url
    );

    if (sessionInfo?.isLoggedIn) {
      this.info.isLoggedIn = sessionInfo.isLoggedIn;
      this.info.webId = sessionInfo.webId;
      this.info.sessionId = sessionInfo.sessionId;
      // The login event can only be triggered **after** the user has been
      // redirected from the IdP with access and ID tokens.
      this.emit("login");

      if (typeof sessionInfo.expirationDate === "number") {
        setTimeout(async () => {
          await this.logout();
        }, sessionInfo.expirationDate - Date.now());
      }
    } else {
      // Silent authentication happens after a refresh, which means there are no
      // OAuth params in the current location IRI. It can only succeed if a session
      // was previously logged in, in which case its ID will be present with a known
      // identifier in local storage.
      // Check if we have a locally stored session ID...
      const storedSessionId = window.localStorage.getItem(KEY_CURRENT_SESSION);
      // ...if not, then there is no ID token, and so silent authentication cannot happen, but
      // if we do have a stored session ID, attempt to re-authenticate now silently.
      if (storedSessionId !== null) {
        await silentlyAuthenticate(storedSessionId, this.clientAuthentication);
      }
    }
    this.tokenRequestInProgress = false;
    return sessionInfo;
  };

  /**
   * Register a callback function to be called when a user completes login.
   *
   * The callback is called when {@link handleIncomingRedirect} completes successfully.
   *
   * @param callback The function called when a user completes login.
   */
  onLogin(callback: () => unknown): void {
    this.on("login", callback);
  }

  /**
   * Register a callback function to be called when a user logs out:
   *
   * @param callback The function called when a user completes logout.
   */
  onLogout(callback: () => unknown): void {
    this.on("logout", callback);
  }

  /**
   * Register a callback function to be called when a session is restored.
   *
   * Note: the callback will be called with the saved value of the 'current URL'
   * at the time the session was restored.
   *
   * @param callback The function called when a user completes logout.
   */
  onSessionRestore(callback: (currentUrl: string) => unknown): void {
    this.on("sessionRestore", callback);
  }
}
