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

/**
 * @hidden
 */
import { EventEmitter } from "events";
import {
  EVENTS,
  ILoginInputOptions,
  ISessionInfo,
  IStorage,
  ResourceServerSession,
} from "@inrupt/solid-client-authn-core";
import { v4 } from "uuid";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { KEY_CURRENT_SESSION, KEY_CURRENT_URL } from "./constant";
import { postRedirectUrlToParent, setupIframeListener } from "./iframe";

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

export interface IHandleIncomingRedirectOptions {
  /**
   * If the user has signed in before, setting this to `true` will automatically
   * redirect them to their Solid Identity Provider, which will then attempt to
   * re-activate the session and send the user back to your app without
   * requiring user interaction.
   * If your app's access has not expired yet and re-activation completed
   * successfully, a `sessionRestore` event will be fired with the URL the user
   * was at before they were redirected to their Solid Identity Provider.
   * {@see onSessionRestore}
   */
  restorePreviousSession?: boolean;

  /**
   * Inrupt's Enterprise Solid Server can set a cookie to allow the browser to
   * access private resources on a Pod. In order to mitigate the logout-on-refresh
   * issue on the short term, the server also implemented a session endpoint
   * enabling the client app to know whether the cookie is set. When a user
   * logs in to a server that has that capability enabled, applications that set
   * this option to `true` will be able to make use of it.
   *
   * If your app supports the newest session restore approach, and `restorePreviousSession`
   * is set to true, this option is automatically set to false, but your app will
   * not be logged out when reloaded.
   *
   * `useEssSession` defaults to false and will be removed in the future; to
   * preserve sessions across page reloads, use of `restorePreviousSession` is
   * recommended.
   */
  useEssSession?: boolean;
  /**
   * The URL of the page handling the redirect, including the query
   * parameters — these contain the information to process the login.
   * Note: as a convenience, if no URL value is specified here, we default to
   * using the browser's current location.
   */
  url?: string;
}

export async function silentlyAuthenticate(
  sessionId: string,
  clientAuthn: ClientAuthentication,
  options: {
    inIframe?: boolean;
  } = {
    inIframe: false,
  },
  session: Session
): Promise<boolean> {
  // Check if we have session information in storage - if we do then we may be
  // currently logged in, and the user has refreshed their browser page.
  const storedSessionInfo = await clientAuthn.validateCurrentSession();
  if (storedSessionInfo !== null) {
    // It can be really useful to save the user's current browser location,
    // so that we can restore it after completing the silent authentication
    // on incoming redirect. This way, the user is eventually redirected back
    // to the page they were on and not to the app's redirect page.
    window.localStorage.setItem(KEY_CURRENT_URL, window.location.href);
    await clientAuthn.login(
      {
        sessionId,
        prompt: "none",
        oidcIssuer: storedSessionInfo.issuer,
        redirectUrl: storedSessionInfo.redirectUrl,
        clientId: storedSessionInfo.clientAppId,
        clientSecret: storedSessionInfo.clientAppSecret,
        tokenType: storedSessionInfo.tokenType ?? "DPoP",
        inIframe: options.inIframe,
      },
      session
    );
    return true;
  }
  return false;
}

function isLoggedIn(
  sessionInfo?: ISessionInfo
): sessionInfo is ISessionInfo & { isLoggedIn: true } {
  return !!sessionInfo?.isLoggedIn;
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

  // Remove this when removing the `useEssSession` workaround:
  private tmpFetchWithCookies = false;

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

    // Listen for messages from children iframes.
    setupIframeListener(async (redirectUrl: string) => {
      const sessionInfo =
        await this.clientAuthentication.handleIncomingRedirect(
          redirectUrl,
          this
        );

      // If silent authentication was not successful, do nothing;
      // the existing session might still be valid for a while,
      // and will expire by itself.
      if (!isLoggedIn(sessionInfo)) {
        return;
      }
      // After having revalidated the session,
      // make sure to apply the new expiration time:
      this.setSessionInfo(sessionInfo);
    });
    // Listen for the 'tokenRenewal' signal to trigger the silent token renewal.
    this.on("tokenRenewal", () =>
      silentlyAuthenticate(
        this.info.sessionId,
        this.clientAuthentication,
        {
          inIframe: true,
        },
        this
      )
    );
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
    await this.clientAuthentication.login(
      {
        sessionId: this.info.sessionId,
        ...options,
        // Defaults the token type to DPoP
        tokenType: options.tokenType ?? "DPoP",
      },
      this
    );
    // `login` redirects the user away from the app,
    // so unless it throws an error, there is no code that should run afterwards
    // (since there is no "after" in the lifetime of the script).
    // Hence, this Promise never resolves:
    return new Promise(() => undefined);
  };

  /**
   * Fetches data using available login information. If the user is not logged in, this will behave as a regular `fetch`. The signature of this method is identical to the [canonical `fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
   *
   * @param url The URL from which data should be fetched.
   * @param init Optional parameters customizing the request, by specifying an HTTP method, headers, a body, etc. Follows the [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/).
   */
  fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return this.clientAuthentication.fetch(url, {
      ...init,
      credentials: this.tmpFetchWithCookies
        ? /* istanbul ignore next Simulating a cookie-enabled session in tests is too much work for a temporary, disabled-by-default workaround: */
          "include"
        : /* istanbul ignore next Simulating a cookie-enabled session in tests is too much work for a temporary, disabled-by-default workaround: */
          init?.credentials,
    });
  };

  /**
   * Logs the user out of the application. This does not log the user out of their Solid identity provider, and should not redirect the user away.
   */
  logout = async (): Promise<void> => {
    await this.clientAuthentication.logout(this.info.sessionId);
    this.info.isLoggedIn = false;
    this.tmpFetchWithCookies = false;
    this.emit("logout");
  };

  /**
   * Completes the login process by processing the information provided by the
   * Solid identity provider through redirect.
   *
   * @param options See {@see IHandleIncomingRedirectOptions}.
   */
  handleIncomingRedirect = async (
    inputOptions: string | IHandleIncomingRedirectOptions = {}
  ): Promise<ISessionInfo | undefined> => {
    if (this.info.isLoggedIn) {
      return this.info;
    }

    if (this.tokenRequestInProgress) {
      return undefined;
    }
    const options =
      typeof inputOptions === "string" ? { url: inputOptions } : inputOptions;
    const url = options.url ?? window.location.href;

    if (window.frameElement !== null) {
      // This is being loaded from an iframe, so send the redirect
      // URL to the parent window on the same origin.
      postRedirectUrlToParent(url);
      return undefined;
    }

    // Unfortunately, regular sessions are lost when the user refreshes the page or opens a new tab.
    // While we're figuring out the API for a longer-term solution, as a temporary workaround some
    // *resource* servers set a cookie that keeps the user logged in after authenticated requests,
    // and expose the fact that they set it on a special endpoint.
    // After login, we store that fact in LocalStorage. This means that we can now look for that
    // data, and if present, indicate that the user is already logged in.
    // Note that there are a lot of edge cases that won't work well with this approach, so it willl
    // be removed in due time, and is disabled by default.
    if (
      options.useEssSession !== true ||
      options.restorePreviousSession === true
    ) {
      window.localStorage.setItem(
        "tmp-resource-server-session-enabled",
        "false"
      );
    } else {
      window.localStorage.setItem(
        "tmp-resource-server-session-enabled",
        "true"
      );
    }
    const storedSessionCookieReference = window.localStorage.getItem(
      "tmp-resource-server-session-info"
    );
    if (
      typeof storedSessionCookieReference === "string" &&
      options.restorePreviousSession !== true &&
      options.useEssSession === true
    ) {
      // TOOD: Re-use the type used when writing this data:
      // https://github.com/inrupt/solid-client-authn-js/pull/920/files#diff-659ac87dfd3711f4cfcea3c7bf6970980f4740fd59df45f04c7977bffaa23e98R118
      // To keep temporary code together
      // eslint-disable-next-line no-inner-declarations
      function isValidSessionCookieReference(
        reference: Record<string, unknown>
      ): reference is ResourceServerSession {
        const resourceServers = Object.keys(
          (reference as ResourceServerSession).sessions ?? {}
        );
        return (
          typeof (reference as ResourceServerSession).webId === "string" &&
          resourceServers.length > 0 &&
          typeof (reference as ResourceServerSession).sessions[
            resourceServers[0]
          ].expiration === "number"
        );
      }
      const reference = JSON.parse(storedSessionCookieReference);
      if (isValidSessionCookieReference(reference)) {
        const resourceServers = Object.keys(reference.sessions);
        const webIdOrigin = new URL(reference.webId).hostname;
        const ownResourceServer = resourceServers.find((resourceServer) => {
          return new URL(resourceServer).hostname === webIdOrigin;
        });
        // Usually the user's WebID is also a Resource server for them,
        // so we pick the expiration time for that. If it doesn't exist,
        // we just pick the first (and probably only) one:
        const relevantServer = ownResourceServer ?? resourceServers[0];
        // If the cookie is valid for fewer than five minutes,
        // pretend it's not valid anymore already, to avoid small misalignments
        // resulting in invalid states:
        if (
          reference.sessions[relevantServer].expiration - Date.now() >
          5 * 60 * 1000
        ) {
          this.info.isLoggedIn = true;
          this.info.webId = reference.webId;
          this.tmpFetchWithCookies = true;
          return this.info;
        }
      }
    }
    // end of temporary workaround.

    this.tokenRequestInProgress = true;
    const sessionInfo = await this.clientAuthentication.handleIncomingRedirect(
      url,
      this
    );
    if (isLoggedIn(sessionInfo)) {
      this.setSessionInfo(sessionInfo);
      const currentUrl = window.localStorage.getItem(KEY_CURRENT_URL);
      if (currentUrl === null) {
        // The login event can only be triggered **after** the user has been
        // redirected from the IdP with access and ID tokens.
        this.emit("login");
      } else {
        // If an URL is stored in local storage, we are being logged in after a
        // silent authentication, so remove our currently stored URL location
        // to clean up our state now that we are completing the re-login process.
        window.localStorage.removeItem(KEY_CURRENT_URL);
        this.emit("sessionRestore", currentUrl);
      }
    } else if (options.restorePreviousSession === true) {
      // Silent authentication happens after a refresh, which means there are no
      // OAuth params in the current location IRI. It can only succeed if a session
      // was previously logged in, in which case its ID will be present with a known
      // identifier in local storage.
      // Check if we have a locally stored session ID...
      const storedSessionId = window.localStorage.getItem(KEY_CURRENT_SESSION);
      // ...if not, then there is no ID token, and so silent authentication cannot happen, but
      // if we do have a stored session ID, attempt to re-authenticate now silently.
      if (storedSessionId !== null) {
        // TODO: iframe-based authentication being still experimental, it is disabled
        // by default here. When it settles down, the following could be set to true,
        // in which case the unresolving promise afterwards would need to be changed.
        const attemptedSilentAuthentication = await silentlyAuthenticate(
          storedSessionId,
          this.clientAuthentication,
          undefined,
          this
        );
        // At this point, we know that the main window will imminently be redirected.
        // However, this redirect is asynchronous and there is no way to halt execution
        // until it happens precisely. That's why the current Promise simply does not
        // resolve.
        if (attemptedSilentAuthentication) {
          return new Promise(() => {});
        }
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
   * Register a callback function to be called when a user logs out:
   *
   * @param callback The function called when an error occurs.
   * @since 1.11.0
   */
  onError(
    callback: (
      error: string | null,
      errorDescription?: string | null
    ) => unknown
  ): void {
    this.on(EVENTS.ERROR, callback);
  }

  /**
   * Register a callback function to be called when a session is restored.
   *
   * Note: the callback will be called with the saved value of the 'current URL'
   * at the time the session was restored.
   *
   * @param callback The function called when a user's already logged-in session is restored, e.g., after a silent authentication is completed after a page refresh.
   */
  onSessionRestore(callback: (currentUrl: string) => unknown): void {
    this.on("sessionRestore", callback);
  }

  /**
   * Register a callback that runs when the session expires and can no longer
   * make authenticated requests, but following a user logout.
   * @param callback The function that runs on session expiration.
   * @since 1.11.0
   */
  onSessionExpiration(callback: () => unknown): void {
    this.on(EVENTS.SESSION_EXPIRED, callback);
  }

  private setSessionInfo(
    sessionInfo: ISessionInfo & { isLoggedIn: true }
  ): void {
    this.info.isLoggedIn = sessionInfo.isLoggedIn;
    this.info.webId = sessionInfo.webId;
    this.info.sessionId = sessionInfo.sessionId;
    this.info.expirationDate = sessionInfo.expirationDate;
    this.on(EVENTS.SESSION_EXTENDED, (expiresIn: number) => {
      this.info.expirationDate = Date.now() + expiresIn * 1000;
    });
  }
}
