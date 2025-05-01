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
 */
import type {
  ILoginInputOptions,
  ISessionInfo,
  IStorage,
  ISessionEventListener,
  IHasSessionEventListener,
  ILogoutOptions,
  SessionConfig,
  SessionTokenSet,
} from "@inrupt/solid-client-authn-core";
import {
  InMemoryStorage,
  EVENTS,
  buildAuthenticatedFetch,
  getWebidFromTokenPayload,
} from "@inrupt/solid-client-authn-core";
import { v4 } from "uuid";
import EventEmitter from "events";
import { exportJWK } from "jose";
import type ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import IssuerConfigFetcher from "./login/oidc/IssuerConfigFetcher";
import StorageUtilityNode from "./storage/StorageUtility";

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
   * and `insecureStorage`, which are named inaccurately and will be eventually deprecated.
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
   * A boolean flag indicating whether a session should be constantly kept alive in the background.
   */
  keepAlive: boolean;
}

/**
 * If no external storage is provided, this storage gets used.
 * @hidden This is for internal use only.
 */
export const defaultStorage = new InMemoryStorage();

const storageUtility = new StorageUtilityNode(defaultStorage, defaultStorage);

/**
 * Default cache for OpenID Providers configurations.
 * @hidden this is for internal use only.
 */
export const issuerConfigFetcher = new IssuerConfigFetcher(storageUtility);

/**
 * A {@link Session} object represents a user's session on an application. The session holds state, as it stores information enabling access to private resources after login for instance.
 */
export class Session implements IHasSessionEventListener {
  /**
   * Information regarding the current session.
   */
  public readonly info: ISessionInfo;

  /**
   * Session attribute exposing the EventEmitter interface, to listen on session
   * events such as login, logout, etc.
   * @since 1.14.0
   */
  public readonly events: ISessionEventListener;

  private clientAuthentication: ClientAuthentication;

  private tokenRequestInProgress = false;

  private lastTimeoutHandle = 0;

  private config: SessionConfig;

  /**
   * Creates a session from auth state information (code verifier and state)
   * This is useful for continuing the auth code flow after storing the auth state
   * in an external database in clustered deployments.
   *
   * @param authState Object containing codeVerifier and state needed to continue the auth flow
   * @param sessionId Optional ID for the session, if not provided a random UUID will be generated
   * @returns A Session instance with enough context to continue the auth code flow
   * @since 2.5.0
   * @example
   * ```typescript
   * const session = Session.fromAuthState(authState, "my-session-id");
   *
   * // Use the restored session
   * const info = await session.handleIncomingRedirect(originalUrl);
   * ```
   */
  public static async fromAuthState(
    authState: { codeVerifier: string; state: string },
    sessionId: string | undefined = undefined,
  ): Promise<Session> {
    const finalSessionId = sessionId ?? v4();

    // Create a temporary storage utility
    const tempStorage = new InMemoryStorage();
    const tempStorageUtility = new StorageUtilityNode(tempStorage, tempStorage);

    // Create a session with minimal info
    const session = new Session({
      sessionInfo: {
        sessionId: finalSessionId,
        isLoggedIn: false,
      },
    });

    // Store the code verifier in the appropriate location for the redirect handler to access
    const oidcContext = {
      codeVerifier: authState.codeVerifier,
      state: authState.state,
    };

    // Store in oidcContext storage - this must match the pattern used by loadOidcContextFromStorage
    // Manually create the context here since we can't easily use the full storage utility pattern
    await tempStorageUtility.setForUser(finalSessionId, {
      oidcContext: JSON.stringify(oidcContext),
    });

    return session;
  }

  /**
   * Creates a session from a set of tokens without requiring a full login flow.
   * This is useful for scenarios where you already have tokens from another source
   * and want to create an authenticated session directly.
   *
   * @param sessionTokenSet The token set to use for authentication
   * @param sessionId Optional ID for the session, if not provided a random UUID will be generated
   * @returns A Session instance
   * @since 2.4.0
   * @example
   * ```typescript
   * const session = Session.fromTokens(mySessionTokenSet, "my-session-id");
   *
   * // Use the authenticated session
   * const response = await session.fetch("https://pod.example.com/private-resource");
   * ```
   */
  public static async fromTokens(
    sessionTokenSet: SessionTokenSet,
    sessionId: string | undefined = undefined,
  ): Promise<Session> {
    const finalSessionId = sessionId ?? v4();
    const isExpired =
      sessionTokenSet.expiresAt !== undefined &&
      sessionTokenSet.expiresAt * 1000 < Date.now();
    let webId;
    if (!isExpired && sessionTokenSet.idToken) {
      const issuerConfig = await issuerConfigFetcher.fetchConfig(
        sessionTokenSet.issuer,
      );
      try {
        const payload = await getWebidFromTokenPayload(
          sessionTokenSet.idToken,
          // The JWKS URI is mandatory in the spec, so the non-null assertion is valid.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          issuerConfig.jwksUri,
          sessionTokenSet.issuer,
          sessionTokenSet.clientId,
        );
        webId = payload.webId;
      } catch {
        // ignore this and just return an unauthenticated session
      }
    }

    // Create a temporary storage so we can construct a SessionInfo including internal details using the
    // existing code pending a simplification of Session management.
    const tempStorage = new InMemoryStorage();
    const clientAuth = getClientAuthenticationWithDependencies({
      secureStorage: tempStorage,
      insecureStorage: tempStorage,
    });
    await clientAuth.setSession(finalSessionId, {
      // ISessionInfo fields
      webId: sessionTokenSet.webId ?? webId,
      isLoggedIn: !isExpired && webId !== undefined,
      clientAppId: sessionTokenSet.clientId,
      expirationDate: sessionTokenSet.expiresAt,
      // ISessionInternalInfo fields
      refreshToken: sessionTokenSet.refreshToken,
      issuer: sessionTokenSet.issuer,
      tokenType: sessionTokenSet.dpopKey === undefined ? "Bearer" : "DPoP",
      publicKey:
        sessionTokenSet.dpopKey?.publicKey !== undefined
          ? JSON.stringify(sessionTokenSet.dpopKey?.publicKey)
          : undefined,
      privateKey:
        sessionTokenSet.dpopKey?.privateKey !== undefined
          ? JSON.stringify(await exportJWK(sessionTokenSet.dpopKey?.privateKey))
          : undefined,
    });

    const sessionInfo = await clientAuth.getSessionInfo(finalSessionId);

    // Create a session with the token information
    const session = new Session({
      sessionInfo,
      clientAuthentication: clientAuth,
      keepAlive: false,
    });

    if (
      isExpired ||
      webId === undefined ||
      sessionTokenSet.idToken === undefined
    ) {
      return session;
    }

    const fetch = buildAuthenticatedFetch(sessionTokenSet.idToken, {
      dpopKey: sessionTokenSet.dpopKey,
      expiresIn: sessionTokenSet.expiresAt
        ? sessionTokenSet.expiresAt - Date.now()
        : undefined,
      eventEmitter: session.events,
    });

    return Object.assign(session, { fetch });
  }

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
    sessionId: string | undefined = undefined,
  ) {
    this.events = new EventEmitter();
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
        isLoggedIn: sessionOptions.sessionInfo.isLoggedIn,
        webId: sessionOptions.sessionInfo.webId,
        clientAppId: sessionOptions.sessionInfo.clientAppId,
      };
    } else {
      this.info = {
        sessionId: sessionId ?? v4(),
        isLoggedIn: false,
      };
    }
    this.config = {
      // Default to true for backwards compatibility.
      keepAlive: sessionOptions.keepAlive ?? true,
    };
    // Keeps track of the latest timeout handle in order to clean up on logout
    // and not leave open timeouts.
    this.events.on(EVENTS.TIMEOUT_SET, (timeoutHandle: number) => {
      this.lastTimeoutHandle = timeoutHandle;
    });

    this.events.on(EVENTS.ERROR, () => this.internalLogout(false));
    this.events.on(EVENTS.SESSION_EXPIRED, () => {
      if (
        this.info.expirationDate !== undefined &&
        Date.now() - this.info.expirationDate < 10
      ) {
        // There is a race condition on the expiration event. If another callback was called first
        // and refreshed the session, we do not want to override the logged in status.
        this.expire();
      }
    });
  }

  /**
   * Triggers the login process. Note that this method will redirect the user away from your app.
   *
   * @param options Parameter to customize the login behaviour. In particular, two options are mandatory: `options.oidcIssuer`, the user's identity provider, and `options.redirectUrl`, the URL to which the user will be redirected after logging in their identity provider.
   * @returns This method should redirect the user away from the app: it does not return anything. The login process is completed by {@linkcode handleIncomingRedirect}.
   */
  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (options?: ILoginInputOptions): Promise<void> => {
    const loginInfo = await this.clientAuthentication.login(
      this.info.sessionId,
      {
        ...options,
      },
      this.events,
      this.config,
    );
    if (loginInfo !== undefined) {
      this.info.isLoggedIn = loginInfo.isLoggedIn;
      this.info.sessionId = loginInfo.sessionId;
      this.info.webId = loginInfo.webId;
      this.info.expirationDate = loginInfo.expirationDate;
    }
    if (loginInfo?.isLoggedIn) {
      // Send a signal on successful client credentials login.
      (this.events as EventEmitter).emit(EVENTS.LOGIN);
    }
  };

  /**
   * Fetches data using available login information. If the user is not logged in, this will behave as a regular `fetch`. The signature of this method is identical to the [canonical `fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
   *
   * @param url The URL from which data should be fetched.
   * @param init Optional parameters customizing the request, by specifying an HTTP method, headers, a body, etc. Follows the [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/).
   */
  fetch: typeof fetch = async (url, init) => {
    if (!this.info.isLoggedIn) {
      return fetch(url, init);
    }
    return this.clientAuthentication.fetch(url, init);
  };

  /**
   * Logs the user out of the application.
   *
   * There are 2 types of logout supported by this library,
   * `app` logout and `idp` logout.
   *
   * App logout will log the user out within the application
   * by clearing any session data from the browser. It does
   * not log the user out of their Solid identity provider,
   * and should not redirect the user away.
   * App logout can be performed as follows:
   * ```typescript
   * await session.logout({ logoutType: 'app' });
   * ```
   *
   * IDP logout will log the user out of their Solid identity provider,
   * and will redirect the user away from the application to do so. In order
   * for users to be redirected back to `postLogoutUrl` you MUST include the
   * `postLogoutUrl` value in the `post_logout_redirect_uris` field in the
   * [Client ID Document](https://docs.inrupt.com/ess/latest/security/authentication/#client-identifier-client-id).
   * IDP logout can be performed as follows:
   * ```typescript
   * await session.logout({
   *  logoutType: 'idp',
   *  // An optional URL to redirect to after logout has completed;
   *  // this MUST match a logout URL listed in the Client ID Document
   *  // of the application that is logged in.
   *  // If the application is logged in with a Client ID that is not
   *  // a URI dereferencing to a Client ID Document then users will
   *  // not be redirected back to the `postLogoutUrl` after logout.
   *  postLogoutUrl: 'https://example.com/logout',
   *  // An optional value to be included in the query parameters
   *  // when the IDP provider redirects the user to the postLogoutRedirectUrl.
   *  state: "my-state"
   * });
   * ```
   */
  logout = async (options?: ILogoutOptions): Promise<void> =>
    this.internalLogout(true, options);

  private internalLogout = async (
    emitEvent: boolean,
    options?: ILogoutOptions,
  ): Promise<void> => {
    await this.clientAuthentication.logout(this.info.sessionId, options);
    // Clears the timeouts on logout so that Node does not hang.
    clearTimeout(this.lastTimeoutHandle);
    this.info.isLoggedIn = false;
    if (emitEvent) {
      (this.events as EventEmitter).emit(EVENTS.LOGOUT);
    }
  };

  private expire = () => {
    this.info.isLoggedIn = false;
  };

  /**
   * Completes the login process by processing the information provided by the identity provider through redirect.
   *
   * @param url The URL of the page handling the redirect, including the query parameters — these contain the information to process the login.
   */
  handleIncomingRedirect = async (
    url: string,
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
          this.events,
          this.config,
        );

        if (sessionInfo) {
          this.info.isLoggedIn = sessionInfo.isLoggedIn;
          this.info.webId = sessionInfo.webId;
          this.info.clientAppId = sessionInfo.clientAppId;
          this.info.sessionId = sessionInfo.sessionId;
          if (sessionInfo.isLoggedIn) {
            // The login event can only be triggered **after** the user has been
            // redirected from the IdP with access and ID tokens.
            (this.events as EventEmitter).emit(EVENTS.LOGIN);
          }
        }
      } finally {
        this.tokenRequestInProgress = false;
      }
    }
    return sessionInfo;
  };
}
