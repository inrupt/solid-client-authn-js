# Changelog

This change log is intended to record changes made across all packages contained
within this mono-repo.

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Deprecation notice

- A new signature was introduced for `getSessionFromStorage` in release 2.3.0. The legacy signature is
  deprecated, and will be removed with the 4.0.0 major release.

```javascript
// Deprecated signature
const session = await getSessionFromStorage(
  sessionId,
  storage,
  onNewRefreshToken,
  refresh,
);
// Replacement signature
const session = await getSessionFromStorage(sessionId, {
  storage,
  onNewRefreshToken,
  refresh,
});
```

- The event `EVENTS.NEW_REFRESH_TOKEN` is being replaced by `EVENTS.NEW_TOKENS` which returns all the tokens a client
  can store for refreshing a session.

## Unreleased

The following changes have been implemented but not released yet:

## [3.1.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v3.1.0) - 2025-07-08

### New feature

#### browser and node

- `Session::login` now supports an additional `customScopes: string[]` option.
  It allows developers to specify custom scopes to be added to the authorization request,
  which will be presented to the user by their OpenID Provider on the consent
  prompt. If they consent, the issued ID Token may include additional claims based
  on the requested scopes.

## [3.0.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v3.0.0) - 2025-07-03

### Breaking Changes

- Support for Node.js v18.x has been dropped as that version has reached end-of-life.

### Bugfix

#### browser and node

- Fixed the usage of client information from previous dynamic registration that have no expiration date.

## [2.5.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.5.0) - 2025-05-09

### Feature

#### node

- Added a `logout` function in the token management API that enables RP-initiated logout for multi-user server-side applications. This complements the `refreshTokens` function introduced in 2.4.0, allowing applications that manage tokens in external storage to both refresh tokens and perform identity provider logout without requiring a Session object. Applications can now implement complete user authentication lifecycle management using token sets stored in their own database.
- Added a `EVENTS.AUTHORIZATION_REQUEST` (`authorizationRequest`) event that emits authentication state during login to support clustered deployments.
- Added a static `Session.fromAuthorizationRequestState()` method that creates a new session from previously stored authentication state.

## [2.4.1](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.4.1) - 2025-04-18

### Bugfix

#### node

- `refreshTokens` had a bug causing an unexpected refresh token rotation if the ID token expired,
  resulting in the stored token being stale.

## [2.4.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.4.0) - 2025-04-15

### Bugfix

#### browser and node

- Fix the `Session` error listener typing by adding `Error` to the `errorDescription` type so that it reflects the actual behavior.
  Thanks to @NoelDeMartin for fixing this issue.
- Previously, an application could end up in a bad state when using a dynamically registered
  client identity beyond its expiration date. A user would be redirected to the OpenID Provider,
  and end up on an error page unrelated to the application they were trying to log into. Now,
  expired dynamic clients go through registration again: the user will need to authorize the client
  after expiration, but will not experience further inconveniences.

### Feature

#### node

- Added a `EVENTS.NEW_TOKENS` (`newTokens`) event to be emitted by the `Session` when it receives new tokens when a session is initially
  logged in or refreshed. This event is more useful than `EVENTS.NEW_REFRESH_TOKEN` which is being deprecated.
- Added a static `Session.fromTokens(tokens, sessionId)` method that creates a new authenticated session directly from a token set, without requiring a full login flow.
- Added a new function `refreshTokens` to refresh tokens obtained via the `newTokens` event after the Access Token expired.

## [2.3.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.3.0) - 2024-11-14

### Bugfix

#### node

- The session expiration date (`session.info.expirationDate`) is now correct when loading a `Session` from storage.

### Feature

#### node

- It is now possible to build a `Session` using `getSessionFromStorage` and not log it in
  using its refresh token. To do so, a new `refresh` optional flag has been introduced.
  It defaults to `true`, which makes this a non-breaking change. In addition, a new signature
  is introduced to make it easier to provide the optional arguments:

```javascript
// Legacy signature only specifying one optional argument
const session = await getSessionFromStorage(
  sessionId,
  undefined,
  undefined,
  false,
);

// New signature
const session = await getSessionFromStorage(sessionId, { refresh: false });
```

## [2.2.7](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.7) - 2024-10-30

### Bugfix

#### node

- The IdP logout no longer fails in Node if the session was restored from
  storage (using `getSessionFromStorage`), which is the typical way server-side
  sessions are retrieved.

## [2.2.6](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.6) - 2024-09-18

### Bugfix

#### node and browser

- Repository URL in `package.json` updated to set the `repository.type` property to `git`. This intends at
  restoring the previous behavior of `npm view @inrupt/solid-client-authn repository.url`, expected to return
  `git+https://github.com/inrupt/solid-client-authn-js.git`.

## [2.2.5](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.5) - 2024-09-16

### New Features

- Node 22 is now supported

## [2.2.4](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.4) - 2024-06-24

### Bugfix

#### node and browser

- Fix the initialization of `clientAppId` in `ISessionInfo` objects: `clientAppId` property of the `ISessionInfo` interface, although present, was not being set either in the `ISessionInfo` objects returned by
  the `handleIncomingRedirect` function in `ClientAuthentication`, or in the `Session` class.

### Bugfix

#### node

- The `keepAlive` option (introduced in v2.2.0) is now correctly observed in a script using
  the Client Credentials flow (i.e. using a `clientId` and a `clientSecret` to log in). It
  previously was disregarded, and the `Session` always self-refreshed in the background.

  Note that there still is a timeout being set to notify of session expiration, causing
  NodeJS to wait for the end of the session before closing a terminal. This can be avoided
  by logging the session out explicitly:

  ```javascript
    const session = new Session();
    await session.login({
      oidcIssuer: ...,
      clientId: ...,
      clientSecret: ...,
    });
  ```

  will hang until the session expires, while

  ```javascript
    const session = new Session();
    await session.login({
      oidcIssuer: ...,
      clientId: ...,
      clientSecret: ...,
    });
    await session.logout();
  ```

  will close when logout is complete.

## [2.2.3](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.3) - 2024-06-20

### Bugfix

#### node and browser

- Fix parsing `clientId` from ID Token `azp` claim: the parsing of the ID Token payload was not
  correctly extracting the `clientId` from the `azp` claim. As a result, `session.info.clientAppId`
  was not being initialized upon successful login, which prevented the `idp` logout of the session
  from working as expected.

## [2.2.2](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.2) - 2024-06-18

### Bugfix

#### node

- Maintain token type in `getSessionIdFromStorage`: When loading a session from storage on the server
  (using `getSessionIdFromStorage`), the token type (i.e. DPoP-bound or not, referred to as Bearer) is
  now consistent with the token type initially associated with the session. Previously, regardless of
  the token type requested when logging the session in, the token type defaulted to `DPoP` when logging
  the session back in on load from storage, causing authentication issues.

## [2.2.1](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.1) - 2024-06-04

### Bugfix

#### browser

- Fix #3518: Prevent refresh token from being persisted in local storage.

## [2.2.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.2.0) - 2024-05-03

### New Feature

#### node

- It is now possible to prevent a `Session` self-refreshing in NodeJS. To do so, a new
  parameter is added to the constructor: `Session({ keepAlive: false })`. This prevents
  the `Session` setting a callback to refresh the Access Token before it expires, which
  could cause a memory leak in the case of a server-side application with many users.
  It also avoids unnecessary requests being sent to the OpenID Provider.

## [2.1.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.1.0) - 2024-03-13

### New Feature

#### node and browser

- OpenID Providers with multiple JWK in their JWKS are now supported. Thanks to
  @pavol-brunclik-compote for the original contribution.

#### node

- Authorization code flow for statically registered clients is now supported. Statically registered
  clients previously defaulted to the Client Credentials flow, it is no longer an assumption.

### Bugfix

#### browser

- Fix non-DPoP bound tokens support in browser: a bug in the handling of non-DPoP-bound tokens was
  preventing the auth code grant to complete, with a 401 to the OpenId Provider Token Endpoint
  observed on redirect after the user authenticated. It is now possible to do
  `session.login({/*...*/, tokenType: "Bearer"})` and get a successful result.

## [2.0.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v2.0.0) - 2023-12-20

### Breaking Changes

- Node 16 is no longer supported. The global `fetch` function is used instead of `@inrupt/universal-fetch`.
  This means this library now only works with Node 18 and higher.
- The `Session` class no longer extends `EventEmitter`. Instead, it exposes an `events` attribute implementing
  `EventEmitter`. We do not recommend to use `Session` instance's `events` attribute as an arbitrary events emitter,
  and encourage users to only use the supported events and documented API.
- `Session` methods `onLogin`, `onLogout`, `onError`, `onSessionRestore`, `onSessionExpiration` and `onNewRefreshToken`
  have been removed. They are replaced by calls to `session.events.on`, using the appropriate event name.
- `Session` constructor changes:
  - the `onNewRefreshToken` parameter is no longer supported. Its usage is replaced by calling `session.events.on`
    using the `EVENTS.NEW_REFRESH_TOKEN` constant as a first parameter, and a callback handling the token as a
    second parameter.
  - The `useEssSession` parameter is no longer supported.
- The `getClientAuthenticationWithDependencies` is no longer exported as part of the public API, and is now internal-only.
- The UMD build of `@inrupt/oidc-client-ext` is no longer available. Since this is a package only intended to be
  consumed by `@inrupt/solid-client-authn-browser`, which doesn't have a UMD build, this change should have no
  impact.

### Build system changes

- Moved from `rollup-plugin-typescript2` to `@rollup/plugin-typescript`. Although this should not be a breaking change,
  upgrading may require extra attention.

## [1.17.5](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.17.5) - 2023-11-16

### Internal changes

- This refactors how the the node-based end-to-end tests run to make it possible to run them without having playwright installed. This should not impact downstream consumers.

## [1.17.4](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.17.4) - 2023-11-09

### Bugfixes

#### node

- [Support for `iss` parameter](https://github.com/inrupt/solid-client-authn-js/issues/2985): [RFC9207](https://www.rfc-editor.org/rfc/rfc9207) adds
  an `iss` parameter to the callback IRI, and the Node library wasn't removing it before comparing the effective callback URL to the URL used
  when making the Authorization request.

## [1.17.3](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.17.3) - 2023-10-10

### Bugfixes

#### browser

- [Mismatching redirect URI](https://github.com/inrupt/solid-client-authn-js/issues/2891) on refresh: the root cause of the bug was a race
  condition because of the asynchronous nature of updating the browser URL. The appropriate event is now awaited for, which should prevent
  the issue from manifesting.

## [1.17.2](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.17.2) - 2023-09-15

### Bugfixes

#### browser

- [Mismatching redirect URI](https://github.com/inrupt/solid-client-authn-js/issues/2891) on refresh: this bug was caused by an invalid redirect URL stored with session data.
  Saving an invalid redirect URL is now prohibited, and in addition the storage of users impacted by this bug will be cleared so that they don't have to do anything manually
  to clear their local storage. Users affected by this bug will be asked to log back in, as if they logged out.

## [1.17.1](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.17.1) - 2023-07-15

### Bugfixes

- The `fetch` function is now bound to the window object in all uses within `authn-browser`

## [1.17.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.17.0) - 2023-07-14

### New Feature

- Support for [RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html) in Node and Browser
  libraries.
- ESM support for Node and Browser packages.

## [1.16.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.16.0) - 2023-05-09

### New Feature

- Node 20 support

## [1.15.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.15.0) - 2023-04-17

### New Feature

- Node 18 support

## [1.14.0](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.14.0) - 2023-03-23

### browser and node

#### New features

- The `Session` exposes an `events` attribute implementing `EventEmitter`, with
  type hints to guide which events are supported. It allows to register a callback
  listening on events using `session.events.on`, but also to unregister a callback
  using `session.events.off`, or to register a one-off callback using `session.events.once`.
  This attribute intends at replacing exising `Session` methods to listen on events,
  namely `onLogin`, `onLogout`, `onError`, `onSessionRestore`, `onSessionExpiration`,
  `onNewRefreshToken`.

### node

#### Bugfixes

- The session expiration date was incorrectly computed in the authorization code flow.

## [1.13.4](https://github.com/inrupt/solid-client-authn-js/releases/tag/v1.13.4) - 2023-03-16

### browser

#### Bugfix

- v1.13.3 introduced a bug in the silent reload flow, resulting in a "Mismatching
  redirect URL" error when refreshing a page with an app logged in. This regression
  went unnoticed because of a misconfiguration of the browser-based test app that
  should have covered this scenario. Both issues are now resolved.

### node

#### Bugfix

- The `Session` expiration date was not set in all contexts: `session.info.expirationDate`
  wasn't set properly using Client Credentials.

### browser and node

#### New feature

- Added `events` attribute to the `Session` class to expose full `EventEmitter` API
  with type hints for each supported event. This allows to write code such as the
  following:

  ```
    const mySession = new Session();
    mySession.events.on(EVENTS.LOGIN, () => { console.log("Logged in!") });
  ```

  This is closer to the EventEmitter API, so it should be familiar to more developers.

## 1.13.3 - 2023-03-07

### browser

#### Bugfixes

- No longer remove the last issuer URL path component if it doesn't have a trailing
  slash: a bug was introduced in baac030d33163ba08dadebabdaf676450be7fa88, resulting
  in the issuer configuration discovery failing if the issuer URL had a path that
  did not end with a trailing slash. This is now fixed.

## 1.13.2 - 2023-02-16

### node

#### Bugfixes

- The Client Credential flow had a bug where the expiration time set by the OpenID
  Provider for the token was ignored, and an arbitrary default was applied instead.
  This resulted in the session being unable to make authenticated requests, but
  still acting as if it were logged in. The session now uses the expiration time
  set by the OpenID Provider.

## 1.13.1 - 2023-02-15

### node and browser

#### Dependency updates

- Updated transitive dependencies to fix GHSA-rc47-6667-2j5j

#### Bugfix

- The redirect URL provided to the `login` function was being normalized, which
  could result in misalignments with the redirect URLs declared in a Client Identifier
  document, since the latter wasn't being normalized. The normalization step has
  now been removed, and the redirect provided by the user is sent to the OpenID
  Provider unchanged.

## 1.13.0 - 2023-01-18

### node and browser

#### New feature

- Added support for [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html)

### Browser

#### Bugfixes

- Clean up `iss` parameter from redirect URL after redirect

## 1.12.4 - 2023-01-09

- Upgrades dependencies

## 1.12.3 - 2022-11-23

- Upgrades dependencies

## 1.12.2 - 2022-08-01

### Bugfixes

- Multiple dependencies updates.
- Make support for Node engines explicit.

## 1.12.1 - 2022-06-27

- Fix incompatible type definitions for `fetch` following changes to the typescript definitions.

## 1.12.0 - 2022-06-06

### Breaking Changes

- Support for Node.js v12.x has been dropped as that version has reached
  end-of-life.
- We've cleaned up dynamic client registration by removing
  support for the registrationAccessToken / initialAccessToken
  when performing the registration flow as this feature was never fully
  implemented. For Solid apps we recommend the use
  of a [Public Client Identifier
  Document](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-client/)
- We've also removed support for the iframe-based session renewal, which was
  never fully implemented.

## 1.11.9 - 2022-05-25

### Bugfixes

- Removed immediate use of `window` in Session constructor of the browser package

## 1.11.8 - 2022-05-17

### Breaking change

- the `useEssSession` option is deprecated, and the associated session endpoint
  is no longer used. Note that this option defaulted to false, and no public ESS
  instance was enabling this endpoint, so unless you were explicitly using this
  feature in an ESS instance you were running yourself, this change should not
  affect you. If you were using this in a demo app, you may want to clear its local
  storage.

### Bugfix

#### browser

- The refresh flow was broken for browser-based applications using a client identifier,
  leading to short session lifetime. Now that this is fixed, the background refresh
  will happen normally, and the session will remain active.
- The incoming redirect sometimes left OAuth parameters on the URL, despite
  already having consumed them, this only happened in certain error scenarios,
  but now the parameters will always be removed, such that the user doesn't get
  stuck at an error.

#### node

- The client credential flow as implemented by the Community Solid Server Identity
  Provider is now supported. See [the documentation](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/documentation/client-credentials.md) for more details.

## 1.11.7 - 2022-03-16

### Bugfixes

- @inrupt/oidc-client-ext: remove ts-jest from package dependencies.
- The PKCE verifier is now cleared from storage as soon as it has been used in the
  token exchange, regardless of the token type (it used to not be cleared from part
  of the storage when getting a DPoP-bound token).

## 1.11.6 - 2022-03-04

### Bugfixes

#### browser

- Silent authentication is only attempted once, and no longer retries indefinitely on failure.
- Default values are provided for the OIDC Provider supported scopes if not present
  in the configuration. This fixes <https://github.com/inrupt/solid-client-authn-js/issues/1991>.

## 1.11.5 - 2022-02-14

No changes; fixed issue with npm publish.

## 1.11.4 - 2022-02-11

### Bugfixes

#### node and browser

- The HTU field of the DPoP header is now normalized to remove the query parameters.
  Thanks to @diegoaraujo for his first contribution to the project!
- The Solid-OIDC discovery implemented a deprecated method, and is now updated to
  align with the latest [Solid-OIDC specification](https://solid.github.io/solid-oidc/#discovery).

## 1.11.3 - 2021-08-24

### Bugfixes

#### node

- Using a Client Identifier caused authentication issues at the token endpoint.

#### node and browser

- Passing custom headers to a session's fetch as a Headers object would result in the headers
  being overlooked.
- As per [the Solid-OIDC spec](https://solid.github.io/solid-oidc/#webid-scope), the `webid`
  scope is now added to token requests.
- The ID token is no longer kept in storage.

#### oidc

- Since `oidc-client` has been deprecated, and won't be maintained anymore, the
  OIDC package now depends on a fork, `@inrupt/oidc-client`, so that we can ensure
  the dependencies are kept up-to-date. This should be transparent for users of
  `@inrupt/solid-client-authn-browser`.

## 1.11.2 - 2021-08-24

### Bugfixes

#### oidc

- When dynamically registering a Client to a Solid Identity Provider, the subject
  type was incorrectly set to `pairwise`, instead of `public`. Only `public` makes
  sense in the context of Solid, where subjects (in this case, users) are uniquely
  identified by their WebID. This was disregarded by current Solid Identity Providers,
  so it should not have affected dependants, but it's technically more correct.

#### node

- The `prompt=consent` parameter was missing when redirecting the user to the Solid
  Identity Provider authorization endpoint. This prevented working with the Community
  Solid Server Identity Provider.
- Proactive refreshing of the token prevented NodeJS from shutting down gracefully.
  Logging out now clear the timeout previously set, which resolves the issue.

## 1.11.1 - 2021-08-20

#### oidc

- When dynamically registering a Client to a Solid Identity Provider, the subject
  type was incorrectly set to `pairwise`, instead of `public`. Only `public` makes
  sense in the context of Solid, where subjects (in this case, users) are uniquely
  identified by their WebID. This was disregarded by current Solid Identity Providers,
  so it should not have affected dependants, but it's technically more correct.

#### node

- The `prompt=consent` parameter was missing when redirecting the user to the Solid
  Identity Provider authorization endpoint. This prevented working with the Community
  Solid Server Identity Provider.

## 1.11.0 - 2021-08-12

### New features

#### browser

- Use refresh tokens to keep the sesion alive: The browser client now requests a
  refresh token, and uses it when its access token is about to expire to get a new
  access token. This enables keeping a session alive for longer than the lifetime
  of a single access token.
- The `Session` class now exposes an `onError` method, which is a hook where
  error-handling callbacks may be registered.
- The `Session` class now exposes an `onSessionExpiration` method, which is a hook
  where a callback may be registered to handle session expiration in the case when
  silent authentication fails.

### Bugfixes

#### node

- Trying to log a session in providing dynamically registered client credentials
  along with a refresh token was mistaken for a static client login, leading to an
  "Invalid client credentials" error.

## 1.10.1 - 2021-08-02

### Bugfixes

#### node

- A transitive dependency used submodule exports, which aren't supported yet by
  significant parts of the ecosystem, such as Jest. With an internal change, we enabled
  using @inrupt/solid-client-authn-node without encountering submodule exports.

## 1.10.0 - 2021-07-28

### New features

#### node

- DPoP-bound refresh tokens are now supported, which allows for an increased protection
  against refresh token extraction.
- Client credential grant: for Solid Identity Providers which support it, a client
  may statically register, and use the obtained credentials (client ID and secret)
  to log in to an Identity Provider. This is convenient in some cases, such as CI
  environment. However, it requires offline provider/client interaction, which does
  not scale well in the decentralized ecosystem of Solid. As such, it should only be
  used in specific cases, where the user is able to statically register their app
  to their identity provider (which requires some technical background).

### Bugs fixed

#### browser

- When not using a bundler that automatically provided a polyfill for Node.js
  built-in modules, the `events` package had to be installed manually.

## 1.9.1 - 2021-06-24

### Bugs fixed

#### browser

- Trying to call `Session.fetch` for a Session that had not yet authenticated
  would result in the following error:
  'fetch' called on an object that does not implement interface Window.

## 1.9.0 - 2021-06-16

### Breaking changes

#### browser

- The SessionManager has been removed. Since there is no active use of this
  class that we are aware of, we are not bumping the major version for this.

#### node

- The SessionManager has been removed. Since there is no active use of this
  class that we are aware of, we are not bumping the major version for this.

### New features

#### browser

- solid-client-authn-browser is no longer dependent on (polyfills being
  available for) modules built into Node.js but not available in the browser,
  except for `events`, which will be removed later. This should not cause any
  change in behaviour, but let us know if you encounter any issues.

## 1.8.2 - 2021-06-08

### Bugs fixed

#### browser

- If `restorePreviousSession` was set to true, yet the user's session at their
  Pod server had expired, the Promise returned by `handleIncomingRedirect` would
  never resolve.
- When initialising a new `Session` in Node, e.g. when doing server-side
  rendering, an error would be thrown about trying to access `window`.

### Changed

#### browser

- The `popUp` option for the `login` method, although listed in the API docs,
  never had any effect. It has now been removed.
- The Promise returned by `login` will no longer resolve, because no code is
  able to reliably run after it is called; it redirects the user away from the
  app and thereby terminates all running scripts.

## 1.8.1 - 2021-04-30

### Deprecated

#### node

- With Node.js version 10 [reaching end-of-life on
  2021-04-30](https://github.com/nodejs/Release),
  @inrupt/solid-client-authn-node no longer actively supports it. It will not
  stop working right away, but it will no longer be actively tested and no
  special effort will be made to keep it from breaking.

### New features

#### node

- Node.js version 16 is now supported.

### Bugfixes

#### browser

- The workaround to maintain sessions in 1.6.1 has been disabled by default;
  this means you should see no more (failed) calls to `/session` in your network
  console. If you want to make sure a session is preserved across page reloads,
  please see [the documentation on using the `restorePreviousSession`
  option](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/restore-session-browser-refresh/).
  If you are working with an instance of ESS that still has the dedicated `/session`
  you can still [enable this workaround](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/restore-session-browser-refresh/#cookie-based-sessions-temporary-solution) to maintain the previous behaviour.

The following sections document changes that have been released already:

## 1.8.0 - 2021-04-21

### New features

#### node

- It is now possible to specify a callback when constructing a function in order
  to invoke custom code when the refresh token is rotated. This is useful for users
  who wish to run authenticated scripts, without implementing a brand new storage.

## 1.7.4 - 2021-04-15

### Bugfixes

#### node and oidc

- The OIDC issuer profile is used to negotiate the preferred signature algorithm
  for ID tokens.

#### node

- During client registration, the client explicitly specifies both the 'refresh_token'
  and the 'authorization_code' grants as part of its profile, instead of only relying
  on scopes to get refresh tokens. Depending on the Identity Provider, the former
  behaviour could result in not getting refresh tokens.

## 1.7.3 - 2021-04-09

### Bugfixes

#### oidc

- When the token endpoint returns an error message, it is now bubbled up properly.

#### browser

- Building the browser package is now possible on Windows, thanks to more portable scripts.
- Asynchronous calls that lead to a redirection when restoring a session are now
  blocking, to prevent the error associated to the message `Field [sessionId] for user [...] is not stored`
  that gets thrown when the user is redirected back from the identity provider.

#### browser and node

- When loaded in the same environment (e.g. a full-stack NextJS app), it is no longer
  possible that the browser and node code get mixed together, resulting in code being
  executed in the wrong environment.

## 1.7.2 - 2021-03-10

#### browser and node

- A client WebID can now be provided as part of the `login` options. The library will
  check for compliance of the chosen Solid Identity Provider, and go use the provided
  client WebID or go through Dynamic Client Registration accordingly.

### Bugfixes

#### browser

- Attempting to log in with a hash fragment in the redirect URL no longer throws,
  the hash fragment is simply discarded.
- The ID token is now validated when asking for DPoP-bound tokens, and not only when asking for a Bearer token.

#### node

- The OIDC parameters added to the redirect IRI by the Solid Identity Provider
  are no longer included in the redirect IRI provided at the token endpoint.
- The provided redirect IRI is now normalized.

## 1.7.1 - 2021-03-04

### Bugfixes

#### browser

- Fixed a typo in the TypeScript interface IHandleIncomingRedirectOptions.

## 1.7.0 - 2021-03-03

### New features

#### browser

- New option `useEssSession` for `session.handleIncomingRedirect`: Control to
  enable and disble the behaviour introduced in 1.4.0. If set to false, the
  `/session` endpoint isn't looked up, and cookie-based auth is disabled. The
  behaviour is similar when `restorePreviousSession` is true.

### Bugfixes

#### browser

- Some components of the redirect URL are no longer lost after redirect, which
  prevents silent authentication from failing.

## 1.6.1 - 2021-02-26

### Deprecations

#### browser

- The first parameter to `Session.handleIncomingRedirect` is now an options
  object. If you want to pass in the URL to handle, you can now do so by setting
  the `url` property on the options object. Passing the URL directly as the
  first argument (which has been optional since version 1.5.0, defaulting to
  `window.location.href`) is still possible, but is now deprecated and thus
  might be removed in a future major release.

### Bugfix

#### browser

- Version 1.6.0 automatically redirected the user away from your app after a
  page refresh if they had signed in previously, losing all application state.
  This now no longer happens; instead, you can opt in to automatically restoring
  a user's session after reloading the page by passing a
  `restorePreviousSession` boolean to `handleIncomingRedirect`, and listening
  for the `sessionRestore` event (or passing a callback to `onSessionRestore`)
  to restore your application state.
- No longer send PKCE-related information during DCR, when they are irrelevant.

## 1.6.0 - 2021-02-22

### New features

#### oidc

- `validateIdToken`: A function to check that an ID token has been signed by the
  correct issuer, and that it contains some expected values.

#### browser

- Added new `onSessionRestore` event to `Session` (and default session) to allow
  the developer to register an event callback that will be called whenever a
  session is restored (e.g., due to a browser page refresh). The callback is
  given a URL parameter, which represents the current URL of the browser
  _before_ the session restoration (to allow the developer to restore their
  app's state if needed, e.g., if the app is a Single Page App (SPA) and the
  developer wishes to restore the users 'current page' to exactly where they
  were before the refresh).

### Bugfix

#### browser

- Refreshing the page no longer logs the session out, no matter what Resource Server
  the data is collected from.
- When a session expires, the session is now marked as logged out, and a
  `logout` event is thrown.
- The 'client_id' option, if specified as an option when logging in, is now
  stored in storage, ready to be retrieved again from storage when the login
  flow redirects back to the client application (previously it was only being
  stored if DCR was invoked).
- The issuer URL associated with the session is now necessarily the **canonical**
  issuer's URL, instead of potentially including/missing a trailing slash.

## 1.5.1 - 2020-02-03

### Deprecation

#### browser

- Deprecated SessionManager
- The implicit flow is no longer supported. However, no known Solid Identity issuer
  only supports the implicit flow and not the auth code flow, and no user-facing
  controls enable choosing one's flow, so this has no user impact.

### New features

#### browser

- store the user's issuer claim, specifically to 'localStorage' to allow
  retrieval on tab refresh.

### Bugfix

- Logging out of an app opened in multiple tabs logged the user back in automatically.

## 1.5.0 - 2020-01-28

### New features

#### browser

- `handleIncomingRedirect` uses the current browser URL as a default value.

#### node

- `getSessionFromStorage`: a function to retrieve a session from storage based on
  its session ID (for multi-session management).
- `getSessionIdFromStorageAll`: a function to retrieve the session IDs for all stored
  sessions.
- `clearSessionFromStorageAll`: a function to clear all information about all sessions in
  storage.

### Bugfix

- Any exception thrown by the custom `/session` endpoint lookup is swallowed.

#### node

- Building multiple sessions with the default storage re-initialized a new storage
  each time.

## 1.4.2 - 2020-01-19

### Bugfix

#### browser and node

- The `onLogin` callback couldn't read session information, such as the WebID.

## 1.4.1 - 2020-01-14

### Backward-compatible API changes

#### node

- For `solid-client-authn-node`, the `secureStorage` and `insecureStorage` are
  deprecated, and replaced by `storage`.

### Bugfix

#### browser

- The `Session` constructor in solid-client-authn-browser no longer references
  `window` so that it can be instantiated in a non-window context (although
  it will continue to referene window.localstorage when you attempt to log in.)

## 1.4.0 - 2020-01-11

### New features

- Updating the browser window will no longer log the user out if their WebID is
  hosted on an ESS instance (such as <https://pod.inrupt.com>). A better, global
  solution will be implemented later in order not to break compatibility in the
  ecosystem. The current solution is based on a custom `/session` endpoint lookup,
  and a Resource Server cookie.

## 1.3.0 - 2020-01-06

### New feature

- Although still possible, it is now no longer required to manually instantiate
  a new `Session` object when using `solid-client-authn-browser`. Instead, you can
  directly import `fetch`, `login`, `logout` and `handleIncomingRedirect`,
  which will instantiate a new Session implicitly behind the scenes. If you do
  need access to this Session, you can do so using the new function
  `getDefaultSession`.

### Bugfix

- The `session.info.isLoggedIn` property is now set to false on logout.

## 1.2.6 - 2020-12-23

### Bugfix

- Adds "main" entry to browser packages

## 1.2.5 - 2020-12-17

### Bugfix

- Credentials for statically registered clients weren't stored, which failed the token exchange.

## 1.2.4 - 2020-12-17

- `ajv` was imported through a dependency instead of being explicitly declared as
  a direct dependency of `solid-client-authn-core`

## 1.2.3 - 2020-12-17

### Bugfix

- The `browser` entry in the `package.json` was incorrect, leading to issues when
  bundling the library.

## 1.2.2 - 2020-12-16

### Bugfix

- The WebID is now REALLY set on the session when logging in a script. The initial
  fix introduced in 1.2.1 did compute the WebID from the identity provider response,
  but did not set it properly on the session.

The following sections document changes that have been released already:

## 1.2.1 - 2020-12-16

### Bugfix

- Addressed part of issue <https://github.com/inrupt/solid-client-authn-js/issues/684>,
  by providing a `browser` entry in the `package.json` file. The ES modules export will
  be adressed in a different PR.
- The WebID is now set on the session when logging in a script.
- When logging in with a refresh token (e.g. for a script), if the provided credentials are incorrect, an error is thrown.

## 1.2.0 - 2020-12-04

### New feature

- Support for authenticated scripts: It's now possible to provide a script with login
  parameters for a refresh token, a client ID and a client secret, which enables it to access
  private resources on Pods. This means that it's now easier to write small backend
  scripts which can interact with Pods in an automated way (i.e. no human interaction
  required).

### Bugfixes

- In some use cases (e.g. authenticating a script), logging in happens without a redirection. The architecture so far prevented this
  from being possible, and now after a login that does not require a redirect, the current session may be authenticated.
- Logging in a browser app will now clear OIDC-specific query params from the URL, which prevents a crash on refresh.

### New features

## 1.1.1 - 2020-12-01

### Bugfixes

- issue #685 fixed by removing all URL query params after login, which prevents from crashing when reloading a page.

### Patches

- updated version of `solid-common-vocab` to pull in common RDF/JS types.

## 1.1.0 - 2020-11-27

### New features

- NodeJS support: a new NPM package, `@inrupt/solid-client-authn-node`, is now available to use authentication in a server environment.
- In addition to the features supported by the browser version, `@inrupt/solid-client-authn-node` supports the refresh token grant, which
  makes it possible to maintain long-lived sessions without re-involving the user.

### Bugfixes

- Deriving the WebID from the ID token did not accept some valid IRIs in the subject claim, i.e. issued by a local instance of Node Solid Server.

## 1.0.0 - 2020-11-04

There is no breaking change in this release, but from now on, as per semantic versioning,
we will bump the major version when we change our publicly documented interface.

### Bugfixes

- The expiration claim has been removed from the DPoP token, where it is not needed.
- There were dependency upgrades.

## 0.3.0

### Breaking changes

- The package `@inrupt/oidc-dpop-client-browser` is now called `@inrupt/oidc-client-ext`.
- The public API doesn't expect environement-specific types anymore. in particular, `URL` has been replaced with `string`.

### Non-breaking changes

- It is now possible to build a `Session` without calling `getClientAuthenticationWithDependencies`, which results in simpler code.

### Bugfixes

- If `handleLogin` is called twice, the token endpoint is only hit once, because it might reject replay of the authorization code.
- A DPoP-authenticated request now follow redirects (in particular, forgetting the trailing `/` for a container no longer returns 401).

## [0.2.2]

### Automated test suite

- TestCafe test suite now tests with real tests against both NSS and ESS.

### Security patches

- The support for DPoP was re-implemented in @inrupt/oidc-client-dpop-browser, such that the DPoP JWK is never stored, and only kept inside the closure of the authenticated fetch.

### Bugfixes

- The Authorization header was not set properly, which made it impossible to access private resources.
- The types consumed/returned by the API are now exported for convenience.
- The URL parsing library did not parse properly some redirection IRIs, this is now fixed.
- The dynamic client registration could hang depending on the environment it was deployed in, this is now resolved.
- The `login` event was never actually fired because of a bug which is now fixed.

## [0.2.0]

### Breaking changes

- Fixed typo in `detachSession` function name for the browser `SessionManager`.

### Internal refactor

- Uses [oidc-client-js](https://github.com/IdentityModel/oidc-client-js) now to
  perform the Auth Code Flow (replacing lots of hand-rolled code).

### Bugfixes

- Source files are now also published to npm, so source maps should work from now on.
- Fixed typo in `detachSession` function name for the browser `SessionManager`.

## [0.1.4] - 2020-09-11

### NOTE: We skipped v0.1.3 due to testing the release process

### Bugfixes

- Browser
  - Login now clears the local storage, so that you can log into a different server
    even if not logged out properly.

### Internal refactor

- Created multiple sub-packages, specifically the core and oidc-dpop-client-browser.
- Moved interfaces down into Core.
- Removed TSyringe annotations from the implementation of StorageUtility in the
  Core package and extended it in the browser module (where they we re-applied to
  allow injection again).
- Refactored the StorageUtility code to fix up mock usage.

## [0.1.2] - 2020-09-07

### Internal refactor

- Moved to Lerna (currently only the browser module is available).

## [0.1.1] - 2020-08-14

### Bugfixes

- Browser:
  - The code wasn't shipped properly when publishing a non-dev release to NPMJS.

## [0.1.0] - 2020-08-10

### New features

First release! What's possible with this first release:

- Authenticate a Web app to a Solid Identity provider
- Perform an authenticated fetch to a Pod Server, using a DPoP token
