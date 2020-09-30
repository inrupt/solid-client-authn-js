# Changelog

This change log is intended to record changes made across all packages contained
within this mono-repo.

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
