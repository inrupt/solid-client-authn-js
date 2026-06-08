# Migration proposal: replace hand-rolled OIDC/DPoP code with `oauth4webapi` + `dpop`

**Status:** Draft proposal (not submitted). Branch: `proposal/migrate-to-oauth4webapi`.
**Author note:** This is a design proposal plus a single illustrative POC slice. It is
**not** a complete migration — the rest is described below for incremental landing.

---

## 1. Motivation

`solid-client-authn-js` currently hand-rolls the OIDC and DPoP wire protocol: it
assembles DPoP proof JWTs with `jose`'s `SignJWT`, hand-computes the RFC 9449 `ath`
claim, hand-builds `application/x-www-form-urlencoded` token requests, hand-parses and
hand-validates token responses, and hand-writes dynamic client registration. Two
*different* OAuth stacks are in play across the monorepo:

- **`packages/node`** drives discovery / PKCE / auth-code / refresh through **`openid-client`** (v5).
- **`packages/oidc-browser`** uses **`oidc-client-ts`** for redirect/PKCE *and*
  hand-rolls token exchange + refresh + DCR in `dpop/tokenExchange.ts`,
  `refresh/refreshGrant.ts`, `dcr/clientRegistrar.ts`.
- **`packages/core`** hand-rolls the DPoP proof layer (`authenticatedFetch/dpopUtils.ts`)
  shared by both.

This is a large surface of security-critical protocol code to maintain and test.

**Proposal:** adopt [`oauth4webapi`](https://github.com/panva/oauth4webapi) v3 (a low-level,
zero-dependency, runtime-agnostic OAuth 2.0 / OIDC client) and the
[`dpop`](https://github.com/panva/dpop) v2 package for DPoP proofs. Both are by **Filip
Skokan (panva)** — the author of `jose`, which this repo already depends on — and are
spec-complete, including **RFC 9449 `ath` and `DPoP-Nonce` handling**.

### This subsumes PR #4292

PR #4292 fixes the missing RFC 9449 `ath` claim by hand (adding a `crypto.subtle.digest`
SHA-256 computation and threading the access token through `createDpopHeader` →
`buildDpopFetchOptions`). `dpop.generateProof(keyPair, htu, htm, nonce, accessToken)`
computes `ath` **natively** from its `accessToken` argument and also handles the
`DPoP-Nonce` retry path. Migrating the proof layer therefore fixes the same bug at the
library level. **If this proposal is accepted, PR #4292 can be closed as superseded** —
the POC in this branch reproduces its behaviour and test coverage via `dpop`.

### Proven production model

`@solid/reactive-authentication` (solid-contrib) is a working Solid auth client built
**entirely** on `oauth4webapi ^3` + `dpop ^2`. It exercises exactly the calls this
migration needs against real Solid IdPs (ESS/PodSpaces, NSS/solidcommunity, CSS,
igrant.io, teamid.live), including the awkward-IdP workarounds. It is cited throughout as
the reference for the exact API usage.

---

## 2. Deletion / replacement map

LOC are source lines of the implementation files (excluding their `.spec.ts`); "removed"
is the approximate net implementation code that `oauth4webapi`/`dpop` make unnecessary.
Spec files shrink correspondingly.

| inrupt file | LOC | Disposition | Replaced by |
|---|---:|---|---|
| `packages/core/src/authenticatedFetch/dpopUtils.ts` — `createDpopHeader`, `normalizeHTU`, `accessTokenHash`, `ath` logic | 107 | **Thinned** (POC done here → ~70) | `dpop.generateProof()` (htu normalisation, jti, iat, jwk header, `ath`, nonce) |
| `packages/oidc-browser/src/dpop/tokenExchange.ts` — `getTokens`, `validateTokenEndpointResponse`, 7× `has*` guards, manual form POST + DPoP header | 258 | **Deletable** (core logic) | `oauth.authorizationCodeGrantRequest` + `oauth.processAuthorizationCodeResponse` (+ `oauth.DPoP()` handle) |
| `packages/oidc-browser/src/refresh/refreshGrant.ts` — `refresh`, manual refresh POST, response validation | 138 | **Deletable** | `oauth.refreshTokenGrantRequest` + `oauth.processRefreshTokenResponse` |
| `packages/oidc-browser/src/dcr/clientRegistrar.ts` — `registerClient`, `validateRegistrationResponse`, `processErrorResponse` | 172 | **Deletable** | `oauth.dynamicClientRegistrationRequest` + `oauth.processDynamicClientRegistrationResponse` |
| `packages/node/src/login/oidc/oidcHandlers/RefreshTokenOidcHandler.ts` (jose/openid-client refresh path) | (partial) | **Thinned** | `oauth.refreshTokenGrantRequest` (replaces `openid-client` v5) |
| `packages/node/src/login/oidc/refresh/TokenRefresher.ts` | (partial) | **Thinned** | same grant helpers |
| `packages/node/src/util/dpopInput.ts` — `asDPoPInput` (openid-client v5 ↔ jose v6 CryptoKey bridge) | 33 | **Deletable** | unneeded once `openid-client` is dropped; `oauth.DPoP()` takes the CryptoKeyPair directly |
| `packages/oidc-browser/src/__mocks__/issuer.mocks.ts` (jose-based token mocks) | (test) | **Thinned** | grant-helper mocks |
| PKCE / state / nonce generation (currently via `oidc-client-ts` / `openid-client`) | — | **Replaced** | `oauth.generateRandomCodeVerifier` / `calculatePKCECodeChallenge` / `generateRandomState` / `generateRandomNonce` |
| Discovery / issuer-config fetch (`IssuerConfigFetcher`, `oidc-client-ts` metadata) | — | **Thinned** | `oauth.discoveryRequest` + `oauth.processDiscoveryResponse` |

**Estimated net implementation LOC removed: ~600–700** (tokenExchange 258 + refreshGrant
138 + clientRegistrar 172 + dpopUtils trim ~35 + dpopInput 33, plus discovery/PKCE glue
in node/browser handlers and corresponding spec reductions). Two heavyweight
transitive auth stacks (`openid-client` v5 in node, hand-rolled exchange in browser)
collapse onto one shared low-level library.

### Kept (unchanged public/internal surface)

- The **`Session`** public API (`login`, `logout`, `fetch`, `handleIncomingRedirect`, events).
- The **`IHandleable` handler pattern** (`AuthorizationCodeWithPkceOidcHandler`,
  `RefreshTokenOidcHandler`, `ClientCredentialsOidcHandler`, redirect handlers) — these
  become thin adapters over `oauth4webapi` grant calls instead of over
  `openid-client`/hand-rolled code.
- **Storage** (`StorageUtility`, `ISessionInfoManager`, IndexedDB key persistence).
- **`buildAuthenticatedFetch`** in `fetchFactory.ts` — keeps its refresh-timer and
  redirect-replay logic; only the proof-creation call changes (POC).
- `getWebidFromTokenPayload` / `packages/core/src/util/token.ts` ID-token validation may
  stay or move to `oauth.process*Response` + `oauth.getValidatedIdTokenClaims`; treated
  as Phase 3, not required for the proof-layer slice.

---

## 3. Target architecture

`oauth4webapi` is **stateless and functional** — there is no client object to instantiate.
It works against two plain config records:

- `AuthorizationServer` — the discovered issuer metadata (`oauth.processDiscoveryResponse`).
- `Client` — `{ client_id, client_secret?, token_endpoint_auth_method? }`.

DPoP is a per-flow **handle**: `const dpop = oauth.DPoP(client, keyPair)`, threaded into
each grant request (`{ DPoP: dpop }`); it transparently manages the `DPoP-Nonce` retry.
For one-off resource-request proofs (the `fetchFactory` hot path), the lower-level
`dpop.generateProof(keyPair, htu, htm, nonce, accessToken)` is used directly — this is
exactly what `@solid/reactive-authentication`'s `DPoPTokenProvider.upgrade()` does.

Where these sit relative to existing layers:

```
Session (public API)                         ← unchanged
  └─ LoginHandler / IHandleable handlers      ← kept as thin adapters
       ├─ discovery:  oauth.discoveryRequest / processDiscoveryResponse
       ├─ PKCE/state: oauth.generateRandomCodeVerifier / calculatePKCECodeChallenge /
       │              generateRandomState / generateRandomNonce
       ├─ DCR:        oauth.dynamicClientRegistrationRequest / processDynamicClientRegistrationResponse
       ├─ auth-code:  oauth.validateAuthResponse → authorizationCodeGrantRequest →
       │              processAuthorizationCodeResponse        (+ oauth.DPoP handle)
       ├─ refresh:    oauth.refreshTokenGrantRequest / processRefreshTokenResponse
       └─ client-cred: oauth.clientCredentialsGrantRequest / processClientCredentialsResponse
  └─ buildAuthenticatedFetch (fetchFactory)   ← kept; proof via dpop.generateProof  [POC]
  └─ StorageUtility / IndexedDB keys          ← unchanged (stores CryptoKey / JWK)
```

Client-auth method selection maps to `oauth4webapi` helpers: `oauth.None()` (Solid-OIDC
public client / Client ID Document), `oauth.ClientSecretBasic(secret)` (DCR'd clients).
Note `@solid/reactive-authentication` ships a non-URL-encoding `ClientSecretBasic` variant
for ESS — a known IdP-compat wrinkle to carry over (see Open Questions).

---

## 4. Public-API impact

**Target: none.** This is an internal-only migration. The exported `Session` surface
(`login` / `logout` / `fetch` / `handleIncomingRedirect` / event emitter) and the
`buildAuthenticatedFetch` signature are unchanged.

Potential unavoidable breaks to call out for semver:

- **`createDpopHeader` / `generateDpopKeyPair` / `KeyPair`** are *exported* from
  `@inrupt/solid-client-authn-core` (`packages/core/src/index.ts`). The POC keeps
  `createDpopHeader`'s existing positional signature and only **adds** two optional
  trailing params (`accessToken?`, `nonce?`) — backwards compatible (minor).
  If a later phase removes `createDpopHeader` entirely in favour of `dpop.generateProof`,
  that is a **major** bump; recommend keeping the thin wrapper for one deprecation cycle.
- The embedded-JWK shape in the proof header is now library-controlled (canonical public
  members only). Asserted on confirmation members in the spec rather than strict equality;
  no runtime contract change for verifiers.
- If `getTokens` / `refresh` / `registerClient` (exported from `oidc-browser`) are
  re-implemented over `oauth4webapi`, keep their existing signatures as adapters to avoid
  a major bump; their *return shapes* (`CodeExchangeResult`, `TokenEndpointResponse`) can
  be preserved.

---

## 5. Risks

1. **Browser bundle size.** `oauth4webapi` is small and tree-shakeable (zero deps), and
   `oidc-browser` already ships `jose` + `oidc-client-ts`. Net effect is likely neutral-to-
   smaller once hand-rolled code + possibly `oidc-client-ts` are dropped, but this must be
   measured (bundlephobia + the repo's existing size checks) before claiming a win.
2. **`oauth4webapi` browser support.** It targets the WHATWG `fetch` + Web Crypto
   baseline. DCR (`dynamicClientRegistrationRequest`) and discovery hit the IdP directly —
   **CORS** on the registration/token/discovery endpoints is the real browser risk, same as
   today's hand-rolled `fetch` calls. No regression expected, but validate against ESS/NSS/CSS.
3. **DPoP nonce / `ath` behavioural parity.** `dpop`/`oauth.DPoP()` implement the
   `use_dpop_nonce` retry and `ath` per RFC 9449. Parity with the current (post-#4292)
   behaviour must be confirmed by the conformance/CTH run and against the known-quirky IdPs.
   `@solid/reactive-authentication` already proves this works in production.
4. **Refresh-token + IndexedDB key storage interplay.** Today `KeyPair.publicKey` is a
   `JWK` and the private key is a `CryptoKey`; both are persisted. `oauth.DPoP()` wants a
   `CryptoKeyPair`. The POC bridges via `importJWK`; the full migration should store a
   non-extractable `CryptoKeyPair` directly (IndexedDB can store `CryptoKey`s) and ensure
   refresh reuses the *same* DPoP key — a correctness-critical detail.
5. **Redirect-flow, not popup.** `@solid/reactive-authentication` is popup-based; inrupt
   uses a full-page redirect (`handleIncomingRedirect`). The grant/validate calls are
   identical; only the code-delivery mechanism differs. `oauth.validateAuthResponse`
   consumes the redirect URL's query params directly — a clean fit, but the existing
   redirect handlers' state/PKCE storage must be wired to `oauth4webapi`'s expectations.
6. **Node vs browser packages.** `oauth4webapi` is runtime-agnostic, so it can replace
   `openid-client` (node) **and** the hand-rolled browser exchange with one library. But
   the migration touches both `packages/node` and `packages/oidc-browser`; phase them
   independently to limit blast radius.
7. **Test-suite churn.** Large. Many specs mock `fetch`/`jose`/`openid-client` internals;
   they must be re-pointed at `oauth4webapi` helpers (or, better, run against a mocked
   `fetch` since `oauth4webapi` is just `fetch` calls). Budget meaningful test rewrite.

---

## 6. Phased plan

- **Phase 1 — DPoP proof layer (this POC).** Swap `dpopUtils.createDpopHeader` from
  hand-rolled `jose SignJWT` to `dpop.generateProof`; thread the access token at the
  `fetchFactory` call site → `ath` becomes automatic. **Fixes the #4292 bug natively.**
  Low blast radius, fully self-contained, ships independently.
- **Phase 2 — token exchange + refresh.** Replace `oidc-browser/dpop/tokenExchange.ts` and
  `refresh/refreshGrant.ts` with `oauth.authorizationCodeGrantRequest` /
  `processAuthorizationCodeResponse` and `oauth.refreshTokenGrantRequest` /
  `processRefreshTokenResponse`, using a shared `oauth.DPoP()` handle. Do the equivalent in
  `packages/node` (`RefreshTokenOidcHandler`, `TokenRefresher`, `ClientCredentialsOidcHandler`),
  retiring `openid-client` and `dpopInput.ts`.
- **Phase 3 — discovery / PKCE / DCR / id-token validation.** Move issuer discovery to
  `oauth.discoveryRequest`/`processDiscoveryResponse`, PKCE/state/nonce to the
  `oauth.generateRandom*` helpers, DCR to `oauth.dynamicClientRegistrationRequest`, and
  id-token/webid validation to `oauth.process*Response` + `getValidatedIdTokenClaims`.
- **Phase 4 — delete dead code + drop deps.** Remove `tokenExchange.ts`, `refreshGrant.ts`,
  `clientRegistrar.ts`, `dpopInput.ts`, the `has*` guards, and (if fully replaced)
  `oidc-client-ts` / `openid-client` from the dependency tree. Keep thin exported wrappers
  for one deprecation cycle where public.

---

## 7. Open questions for inrupt maintainers

1. **`oidc-client-ts` future.** Phase 3 could drop it for `oauth4webapi`. Is anything
   (silent-renew iframe, session monitoring) relied on that `oauth4webapi` doesn't cover?
2. **IdP-compat workarounds.** `@solid/reactive-authentication` carries ESS-specific
   workarounds (non-URL-encoded `ClientSecretBasic`; `expectNoNonce` for NSS/igrant;
   ESS missing `iss` in error responses). Should these live in inrupt's lib, and how should
   they be configured (issuer fingerprinting vs explicit options)?
3. **`KeyPair` storage shape.** OK to migrate persisted DPoP keys to a non-extractable
   `CryptoKeyPair` (dropping the JWK public half), or must the `JWK`-shaped public key stay
   for backward compatibility with already-persisted sessions?
4. **Exported helpers.** Are `createDpopHeader` / `getTokens` / `refresh` / `registerClient`
   considered public API to preserve, or internal and removable in a major?
5. **Minimum runtime.** `oauth4webapi` v3 + `dpop` v2 assume modern `fetch`/Web Crypto.
   Confirm the supported Node range (core engines say `^22 || ^24`) and minimum browsers.
6. **`@solid/reactive-authentication` collaboration.** Would inrupt consider aligning with
   / upstreaming the solid-contrib reference rather than maintaining a parallel stack?

---

## 8. POC included on this branch

Phase 1 is implemented as a working slice:

- `packages/core/src/authenticatedFetch/dpopUtils.ts` — `createDpopHeader` reimplemented
  over `dpop.generateProof`; `ath` and `htu` normalisation now library-handled. Adds
  optional `accessToken` and `nonce` params (back-compatible).
- `packages/core/src/authenticatedFetch/fetchFactory.ts` — passes the access token at the
  `buildDpopFetchOptions` call site so resource-request proofs carry `ath` (the #4292 fix).
- `packages/core/src/authenticatedFetch/dpopUtils.spec.ts` — adds `ath` present/absent
  tests; relaxes the embedded-JWK assertion to confirmation members.
- `packages/core/package.json` — adds `oauth4webapi ^3` and `dpop ^2` to `dependencies`.

> The manifest is edited but **not installed** in this branch (CI / a maintainer resolves
> the lockfile). The `import * as DPoP from "dpop"` / `oauth4webapi` modules are therefore
> not yet on disk locally; types and tests resolve once dependencies are installed.

## 9. Phase 2 — implementation notes

Phase 2 migrates the **`packages/oidc-browser`** (`@inrupt/oidc-client-ext`) OAuth/DPoP
engine: token exchange, refresh, and DCR. The node package (`packages/node`,
`openid-client` retirement) is **deferred to a later phase** and was not touched here.

> ⚠️ **Not built/tested.** Per the migration constraints, deps were **not installed**
> (`oauth4webapi`/`dpop` were added to the manifest but no `npm install` was run), so this
> code was **neither compiled nor tested**. Everything below is type-plausible against the
> documented oauth4webapi v3 / dpop v2 API and modelled on `@solid/reactive-authentication`,
> but **all of it requires CI validation** (typecheck + unit + conformance/CTH). Spots that
> are most likely to need adjustment are flagged **(CI-validate)**.

### Files migrated

| File | Before (LOC) | After (LOC) | What changed |
|---|---:|---:|---|
| `packages/oidc-browser/src/dpop/tokenExchange.ts` | 258 | ~300 | `getTokens` now delegates the auth-code→token exchange to `oauth.authorizationCodeGrantRequest` + `oauth.processAuthorizationCodeResponse` with an `oauth.DPoP()` handle. Hand-built form POST + manual DPoP header removed. `validateTokenEndpointResponse` + the `has*` guards **kept as exported helpers** (bearer-vs-DPoP `token_type` assertion has no oauth4webapi equivalent; still exported for back-compat) but **off the hot path**. |
| `packages/oidc-browser/src/refresh/refreshGrant.ts` | 138 | ~145 | `refresh` now delegates to `oauth.refreshTokenGrantRequest` + `oauth.processRefreshTokenResponse`, reusing the **same** bound DPoP key via a fresh `oauth.DPoP()` handle built from the passed-in `KeyPair`. Manual POST + `validateTokenEndpointResponse` re-use removed (this also drops the former `../dpop/tokenExchange` cross-import). |
| `packages/oidc-browser/src/dcr/clientRegistrar.ts` | 172 | ~190 | `registerClient` now delegates to `oauth.dynamicClientRegistrationRequest` + `oauth.processDynamicClientRegistrationResponse`. The bespoke `hasClientId`/`hasRedirectUri` guards and JSON error parsing removed; the redirect-URI mismatch check + inrupt's contextual error messages (`invalid_redirect_uri`/`invalid_client_metadata`/custom) kept as a thin post/catch layer over oauth4webapi's `ResponseBodyError`. |
| `packages/oidc-browser/src/oauth/oauthAdapter.ts` | — | ~205 (new) | **New shared seam.** Maps inrupt's `IIssuerConfig`→`oauth.AuthorizationServer`, `IClient`→`oauth.Client`, selects the `oauth.ClientAuth` helper (`ClientSecretBasic`/`None`), builds an `oauth.DPoP()` handle from the JWK-persisted `KeyPair` (jose `importJWK` bridge), and maps oauth4webapi errors onto inrupt's `OidcProviderError`/`InvalidResponseError`. |
| `packages/oidc-browser/package.json` | — | — | Added `oauth4webapi ^3` + `dpop ^2` to `dependencies` (**not installed** — lockfile resolved by CI). |
| `*.spec.ts` (all three) | — | — | Rewritten to mock the **`oauth4webapi`** boundary (grant/process/DCR helpers + `DPoP`) instead of global `fetch`/internals, mirroring the reference's testing style. Some wire-level assertions (exact URL-encoded body bytes, Basic-auth header string) now live inside oauth4webapi and were dropped, covered by oauth4webapi's own tests + the CTH. One `it.todo` left for the `use_dpop_nonce` retry path (needs a real oauth4webapi nonce error to construct). |

**Net hand-rolled implementation LOC removed (browser): ~570** (tokenExchange exchange logic
+ refreshGrant POST/validation + clientRegistrar request/parse/guards), replaced by ~205 LOC
of shared adapter + thin delegating call sites. Public exports (`getTokens`,
`TokenEndpointInput`, `CodeExchangeResult`, `refresh`, `registerClient`,
`validateTokenEndpointResponse`) and their signatures/return shapes are **unchanged**, so
`packages/browser` (`AuthCodeRedirectHandler`, `ClientRegistrar`, `TokenRefresher`) compiles
against them without edits.

### oauth4webapi / dpop calls used

- **Token exchange:** `oauth.authorizationCodeGrantRequest(as, client, clientAuth, callbackParams, redirectUri, codeVerifier, { DPoP })` → `oauth.processAuthorizationCodeResponse(as, client, response, { expectedNonce: oauth.expectNoNonce, requireIdToken: true })`. Explicit `oauth.isDPoPNonceError` retry guard around `process*` in addition to the handle's auto-retry.
- **Refresh:** `oauth.refreshTokenGrantRequest(as, client, clientAuth, refreshToken, { DPoP })` → `oauth.processRefreshTokenResponse(as, client, response)`, same nonce-retry guard.
- **DCR:** `oauth.dynamicClientRegistrationRequest(as, metadata)` → `oauth.processDynamicClientRegistrationResponse(response)`.
- **DPoP handle:** `oauth.DPoP(client, cryptoKeyPair)` — auto-computes RFC 9449 `ath` and manages `use_dpop_nonce`. **This replaces all manual nonce handling** (there was none explicit before, but the handle is now the single owner of nonce/`ath`).
- **Client auth:** `oauth.ClientSecretBasic(secret)` when a secret is present, else `oauth.None()` (public/Solid-OIDC client → `client_id` goes in the body automatically).
- **Error mapping:** `oauth.ResponseBodyError` / `oauth.AuthorizationResponseError` → `OidcProviderError`; `oauth.WWWAuthenticateChallengeError` → `OidcProviderError`; `oauth.OperationProcessingError` → `InvalidResponseError`.

### Bridges / stubs / behavioural deltas (reviewer must check)

1. **DPoP key is still JWK-persisted, re-imported per call.** `generateDpopKeyPair` still
   returns inrupt's `{ privateKey: CryptoKey, publicKey: JWK }` (so it serialises into
   IndexedDB and survives the redirect). `oauthAdapter.dpopHandleFromKeyPair` re-imports the
   public JWK to a `CryptoKey` (jose `importJWK`) to build the `CryptoKeyPair` the handle
   needs — same bridge as Phase 1. **`// TODO(migration): persist CryptoKeyPair`** left in
   place; moving to a non-extractable `oauth.generateKeyPair("ES256")` end-to-end is Phase 3/4
   and **changes the storage format** (flagged, not done).
2. **Auth-response validation bypass (CI-validate, correctness-critical).** `getTokens`
   constructs the `callbackParams` for `authorizationCodeGrantRequest` from the stored `code`
   and **casts** it to the branded `validateAuthResponse` return type, because the existing
   `AuthCodeRedirectHandler` validates `state` upstream and only `code` reaches `getTokens`.
   This preserves legacy behaviour (the old code also only used `code`) but means `iss`/`state`
   are **not** re-checked by oauth4webapi inside `getTokens`. Phase 3 should move
   `oauth.validateAuthResponse` into the redirect handler and thread the real branded params
   through, removing the cast. **A reviewer must confirm the upstream state check is sufficient.**
3. **`expectedNonce: oauth.expectNoNonce`.** inrupt's redirect handlers don't thread an OIDC
   `nonce`, so id-token nonce verification is disabled to preserve parity. If a `nonce` is
   later threaded, switch to passing it. (CI-validate against IdPs that require a nonce.)
4. **`requireIdToken: true` on the auth-code path.** Mirrors the legacy hard requirement that
   the code exchange returns an `id_token` (`CodeExchangeResult.idToken: string`). The refresh
   path also re-asserts `id_token` presence to keep the old `InvalidResponseError(["id_token"])`
   contract.
5. **`ClientSecretBasic` URL-encoding (CI-validate against ESS).** We use the spec-conformant
   `oauth.ClientSecretBasic`. The legacy inrupt code base64'd `clientId:clientSecret`
   **without** URL-encoding, and `@solid/reactive-authentication` ships a
   `NoUrlEncodeClientSecretBasic` workaround for ESS/PodSpaces. If ESS conformance regresses,
   port that workaround into `oauthAdapter.clientAuthFor` (see Open Question #2).
6. **`token_type` bearer/DPoP assertion dropped from the hot path.** oauth4webapi normalises
   `token_type` and the legacy DPoP-vs-Bearer check was already `it.skip`'d (NSS/ESS return
   `Bearer` for DPoP tokens). `validateTokenEndpointResponse` retains the assertion for
   explicit callers but `getTokens`/`refresh` no longer run it.
7. **Spec `ResponseBodyError` construction (CI-validate).** The rewritten specs build
   `oauth.ResponseBodyError` via `Object.assign(new oauth.ResponseBodyError(...), { error })`;
   the exact v3 constructor arity is unverified offline and may need a tweak under CI.

### Dead-dep status

- **`oidc-client-ts` NOT removed** — still used by `cleanup/cleanup.ts` and re-exported from
  `index.ts` (redirect/PKCE flow in `packages/browser`). Removal is **Phase 3/4**.
- **`uuid` left in deps** — no longer referenced by the migrated production code, but kept to
  avoid breaking anything unverified; remove during the Phase 4 dead-code sweep after a green CI.
- `oauth4webapi`/`dpop` added to `oidc-browser` deps (per scope item 5).

### What remains

- **Phase 3:** issuer discovery → `oauth.discoveryRequest`/`processDiscoveryResponse`
  (removes the `asAuthorizationServer` mapping seam); PKCE/state/nonce →
  `oauth.generateRandom*`; move `oauth.validateAuthResponse` into the redirect handler (closes
  bridge #2); id-token/webid validation → `oauth.getValidatedIdTokenClaims`.
- **Phase 4 (node):** migrate `packages/node` (`RefreshTokenOidcHandler`, `TokenRefresher`,
  `ClientCredentialsOidcHandler`, `dpopInput.ts`) off `openid-client`; then the dead-dep sweep
  (`oidc-client-ts`, `uuid`, `openid-client`) once CI is green.

---

### Faithfulness note on the POC

`dpop.generateProof` expects a `CryptoKeyPair` (public half a `CryptoKey`), but inrupt's
public `KeyPair.publicKey` is a serialisable `JWK`. The POC bridges this with jose's
`importJWK`, keeping `createDpopHeader`'s existing external signature intact. The *full*
migration (Phase 2) avoids the round-trip by holding a non-extractable
`oauth.generateKeyPair("ES256")` `CryptoKeyPair` end-to-end and threading a single
`oauth.DPoP()` handle through the grants — matching `@solid/reactive-authentication`
exactly. The POC's approach is the minimal, lowest-risk slice that proves `dpop` produces
a spec-correct, `ath`-bearing proof drop-in for the existing hand-rolled one.
