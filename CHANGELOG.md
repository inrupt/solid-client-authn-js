# Changelog

This change log is intended to record changes made across all packages contained
within this mono-repo.

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

### New features

### Bugfixes

- Deriving the WebID from the ID token did not accept some valid IRIs in the subject claim, i.e. issued by a local instance of NSS.

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
