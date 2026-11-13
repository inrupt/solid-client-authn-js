# Security policy

This document gathers security-related policies and guidelines for the codebase
available in this repository.

Authentication is a sensitive domain, and as such we designed the `@inrupt/solid-client-authn-*`
libraries with a particular attention to security. In particular,
we decided to apply the following rules:

- Comply with the [OAuth security guidelines](https://tools.ietf.org/id/draft-ietf-oauth-security-topics-15.html)
  This involves, among other things:
  - No support for the implicit grant and the resource owner password grant
  - The use of a PKCE token
  - Binding tokens to a DPoP key to make them sender-constrained whenever possible
- The DPoP key is non-extractable in a browser context to protect it from exfiltration.
- Token lifespan is controlled by the token issuer, not by the library. We recommend that
  tokens used to authenticate requests (e.g., ID Token and Access Token) are given a very
  short lifespan to limit exposure in case of leak. They are not persisted by the library.
- Longer-lived tokens (e.g. refresh tokens) are only persisted in a secure storage.
  This excludes the `localStorage` and `sessionStorage` in browsers.
- If these restrictions on the high-level layer are blocking some legitimate use
  cases, the options is added when possible for advanced users to drop down to a
  lower-level API where token and key management is left to the dependant, and no
  longer a concern of the library.

## Reporting a vulnerability

If you discover a vulnerability in our code, or experience a bug related to security,
please report it following the instructions provided on [Inrupt’s security page](https://inrupt.com/security/).
