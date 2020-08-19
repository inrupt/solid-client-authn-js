/**
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

import IStorage from "./storage/IStorage";
import ILoginInputOptions from "./ILoginInputOptions";
import { EventEmitter } from "events";
import ISessionInfo from "./sessionInfo/ISessionInfo";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { v4 } from "uuid";

/**
 * To initialize a Session instance, either both storages or clientAuthentication are required.
 */
export interface ISessionOptions {
  secureStorage: IStorage;
  insecureStorage: IStorage;
  sessionInfo: ISessionInfo;
  clientAuthentication: ClientAuthentication;
}

/**
 * A {@link Session} object represents a user's session on an application. The session holds state, as it stores information enabling acces to private resources after login for instance.
 */
export class Session extends EventEmitter {
  public readonly info: ISessionInfo;
  private clientAuthentication: ClientAuthentication;

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
        insecureStorage: sessionOptions.insecureStorage
      });
    } else {
      throw new Error(
        "Session requires either storage options or auth fetcher."
      );
    }
    if (sessionOptions.sessionInfo) {
      this.info = {
        sessionId: sessionOptions.sessionInfo.sessionId,
        isLoggedIn: sessionOptions.sessionInfo.isLoggedIn,
        webId: sessionOptions.sessionInfo.webId
      };
    } else {
      this.info = {
        sessionId: sessionId ?? v4(),
        isLoggedIn: false
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
      ...options
    });
    this.emit("login");
  };

  /**
   * Fetches data using available login information. If the user is not logged in, this will behave as a regular `fetch`. The signature of this method is identical to the [canonical `fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
   *
   * @param url The URL from which data should be fetched.
   * @param init Optional parameters customizing the request, by specifying an HTTP method, headers, a body, etc. Follows the [WHATWG Fetch Standard](https://github.github.io/fetch/).
   */
  fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return this.clientAuthentication.fetch(this.info.sessionId, url, init);
  };

  /**
   * Logs the user out of the application. This does not log the user out of the identity provider, and should not redirect the user away.
   */
  logout = async (): Promise<void> => {
    await this.clientAuthentication.logout(this.info.sessionId);
    this.emit("logout");
  };

  /**
   * Completes the login process by receiving the information provided by the identity provider through redirect.
   *
   * @param url The URL where the user has been redirected, as information is given by the identity provider to the app through query strings.
   */
  handleIncomingRedirect = async (
    url: string
  ): Promise<ISessionInfo | undefined> => {
    const sessionInfo = await this.clientAuthentication.handleIncomingRedirect(
      url
    );
    if (sessionInfo) {
      this.info.isLoggedIn = sessionInfo.isLoggedIn;
      this.info.webId = sessionInfo.webId;
    }
    return sessionInfo;
  };

  /**
   * Register a callback function to be called when a user completes login.
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
