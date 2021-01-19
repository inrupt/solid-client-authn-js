# Changelog

This change log is intended to record changes made across all packages contained
within this mono-repo.

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).


## Unreleased


### New features

#### browser

- `handleIncomingRedirect` uses the current browser URL as a default value.

The following sections document changes that have been released already:

### New features

#### node

- `getSessionFromStorage`: a function to retrieve a session from storage based on
its session ID (for multi-session management).

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
hosted on an ESS instance (such as https://pod.inrupt.com). A better, global
solution will be implemented later in order not to break compatibility in the 
ecosystem.

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

- Addressed part of issue https://github.com/inrupt/solid-client-authn-js/issues/684,
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

### Internal refactor:

- Uses [oidc-client-js](https://github.com/IdentityModel/oidc-client-js) now to
perform the Auth Code Flow (replacing lots of hand-rolled code).

### Bugfixes

- Source files are now also published to npm, so source maps should work from now on.
- Fixed typo in `detachSession` function name for the browser `SessionManager`.

## [0.1.4] - 2020-09-11

### NOTE: We skipped v0.1.3 due to testing the release process!

### Bugfixes

- Browser
  - Login now clears the local storage, so that you can log into a different server
even if not logged out properly.

### Internal refactor:
- Created multiple sub-packages, specifically the core and oidc-dpop-client-browser.
- Moved interfaces down into Core.
- Removed TSyringe annotations from the implementation of StorageUtility in the
 Core package and extended it in the browser module (where they we re-applied to
 allow injection again).
- Refactored the StorageUtility code to fix up mock usage.

## [0.1.2] - 2020-09-07

### Internal refactor:
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
