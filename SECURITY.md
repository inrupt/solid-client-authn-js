# Security policy

This document gathers security-related policies and guidelines for the codebase
available in this repository.

Authentication is a sensitive domain, and as such we designed the `@rubensworks/solid-client-authn-*`
libraries with a particular attention to security. In particular, 
we decided to apply the following rules:

- Comply with the [OAuth security guidelines](https://tools.ietf.org/id/draft-ietf-oauth-security-topics-15.html)
This involves, among other things:
  - No support for the implicit grant and the resource owner password grant
  - The use of a PKCE token
  - Binding tokens to a DPoP key to make them sender-constrained whenever possible
- Short-lived tokens (e.g., ID token and Access token) and private cryptographic
material (e.g. a DPoP private key) are only stored in a function closure, so that
they may not be extracted once received from the remote server. These protected 
elements will not be made available directly (e.g. through a function call) or
indirectly (e.g. allowing to sign a header with the DPoP key) to any third-party.
- Longer-lived tokens (e.g. refresh tokens) are only stored in a secure storage,
i.e., a storage which isn't shared beyond the library's control. This means not using
the `localStorage` and `sessionStorage` in browsers.
- If these restrictions on the high-level layer are blocking some legitimate use
cases, the options is added when possible for advanced users to drop down to a
lower-level API where token and key management is left to the dependant, and no
longer a concern of the library. 

# Reporting a vulnerability

If you discover a vulnerability in our code, or experience a bug related to security,
please report it following the instructions provided on [Inrupt’s security page](https://inrupt.com/security/).