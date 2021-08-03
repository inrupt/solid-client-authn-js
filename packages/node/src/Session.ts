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
  InMemoryStorage,
  ISessionInfo,
  IStorage,
} from "@inrupt/solid-client-authn-core";
import { v4 } from "uuid";
// eslint-disable-next-line no-shadow
import { fetch } from "cross-fetch";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";

export interface ISessionOptions {
  /**
   * A private storage, unreachable to other scripts on the page. Typically in-memory.
   * This is deprecated in the NodeJS environment, since there is no issue getting
   * a storage both private and persistent. If both `secureStorage` and its intended
   * replacement `storage` are set, `secureStorage` will be ignored.
   *
   * @deprecated
   */
  secureStorage: IStorage;
  /**
   * A storage where non-sensitive information may be stored, potentially longer-lived
   * than the secure storage. This is deprecated in the NodeJS environment, since there
   * is no issue getting a storage both private and persistent. If both `insecureStorage`
   * and its intended replacement `storage` are set, `insecureStorage` will be ignored.
   *
   * @deprecated
   */
  insecureStorage: IStorage;
  /**
   * A private storage where sensitive information may be stored, such as refresh
   * tokens. The `storage` option aims at eventually replacing the legacy `secureStorage`
   * and `insecureStorage`, which
   * @since X.Y.Z
   */
  storage: IStorage;
  /**
   * Details about the current session
   */
  sessionInfo: ISessionInfo;
  /**
   * An instance of the library core. Typically obtained using `getClientAuthenticationWithDependencies`.
   */
  clientAuthentication: ClientAuthentication;
  /**
   * A callback that gets invoked whenever a new refresh token is obtained.
   */
  onNewRefreshToken?: (newToken: string) => unknown;
}

/**
 * If no external storage is provided, this storage gets used.
 */
export const defaultStorage = new InMemoryStorage();

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

  private onNewRefreshToken?: (newToken: string) => unknown;

  /**
   * Session object constructor. Typically called as follows:
   *
   * ```typescript
   * const session = new Session(
   *   {
   *     clientAuthentication: getClientAuthenticationWithDependencies({})
   *   },
   *   "mySession"
   * );
   * ```
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
    } else if (sessionOptions.storage) {
      this.clientAuthentication = getClientAuthenticationWithDependencies({
        secureStorage: sessionOptions.storage,
        insecureStorage: sessionOptions.storage,
      });
    } else if (sessionOptions.secureStorage && sessionOptions.insecureStorage) {
      this.clientAuthentication = getClientAuthenticationWithDependencies({
        secureStorage: sessionOptions.secureStorage,
        insecureStorage: sessionOptions.insecureStorage,
      });
    } else {
      this.clientAuthentication = getClientAuthenticationWithDependencies({
        secureStorage: defaultStorage,
        insecureStorage: defaultStorage,
      });
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
    this.onNewRefreshToken = sessionOptions.onNewRefreshToken;
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
    const loginInfo = await this.clientAuthentication.login(
      this.info.sessionId,
      {
        ...options,
      },
      this.onNewRefreshToken
    );
    if (loginInfo !== undefined) {
      this.info.isLoggedIn = loginInfo.isLoggedIn;
      this.info.sessionId = loginInfo.sessionId;
      this.info.webId = loginInfo.webId;
    }
  };

  /**
   * Fetches data using available login information. If the user is not logged in, this will behave as a regular `fetch`. The signature of this method is identical to the [canonical `fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
   *
   * @param url The URL from which data should be fetched.
   * @param init Optional parameters customizing the request, by specifying an HTTP method, headers, a body, etc. Follows the [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/).
   */
  fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    if (!this.info.isLoggedIn) {
      // TODO: why does this.clientAuthentication.fetch return throws
      // ""'fetch' called on an object that does not implement interface Window"
      // when unauthenticated ?
      return fetch(url, init);
    }
    return this.clientAuthentication.fetch(url, init);
  };

  /**
   * Logs the user out of the application. This does not log the user out of the identity provider, and should not redirect the user away.
   */
  logout = async (): Promise<void> => {
    await this.clientAuthentication.logout(this.info.sessionId);
    this.info.isLoggedIn = false;
    this.emit("logout");
  };

  /**
   * Completes the login process by processing the information provided by the
   * Solid identity provider through redirect.
   *
   * @param options See {@see IHandleIncomingRedirectOptions}.
   */
  handleIncomingRedirect = async (
    url: string,
    onError?: (
      error: string | null,
      errorDescription?: string | null | undefined
    ) => unknown
  ): Promise<ISessionInfo | undefined> => {
    let sessionInfo;

    if (this.info.isLoggedIn) {
      sessionInfo = this.info;
    } else if (this.tokenRequestInProgress) {
      // TODO: PMcB55:  Add this logging once we start using LogLevel.
      // Log the interesting fact that (we think!) we're already requesting
      // the token...
      // log.debug(`Handle incoming request called, but we're already requesting our token`);
    } else {
      try {
        this.tokenRequestInProgress = true;
        sessionInfo = await this.clientAuthentication.handleIncomingRedirect(
          url,
          this.onNewRefreshToken,
          onError
        );

        if (sessionInfo) {
          this.info.isLoggedIn = sessionInfo.isLoggedIn;
          this.info.webId = sessionInfo.webId;
          this.info.sessionId = sessionInfo.sessionId;
          if (sessionInfo.isLoggedIn) {
            // The login event can only be triggered **after** the user has been
            // redirected from the IdP with access and ID tokens.
            this.emit("login");
          }
        }
      } finally {
        this.tokenRequestInProgress = false;
      }
    }
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
}
