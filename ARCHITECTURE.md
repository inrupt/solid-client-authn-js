# Solid-client-authn-* architecture

This document summarizes the architecture of the `@inrupt/solid-client-authn-*`
modules. It applies to both `@inrupt/solid-client-authn-node` and `@inrupt/solid-client-authn-browser`.

## Module map

https://github.com/inrupt/solid-client-authn-js is a Lerna-based monorepo, which
means this single Git repository actually hosts several npm modules that are
related to each other. The following diagram shows an overview of the modules and their 
relationships.

![Module dependencies](./documentation/diagrams/module_map.svg)

`@inrupt/solid-client-authn-node` and `@inrupt/solid-client-authn-browser` (grouped under the
"Client libraries" label) are the modules we expect developers to import.
As their names imply, each  of these modules is specific to a given environment 
(NodeJS or the browser). However, they both have very similar APIs and architecture,
and mostly differ by their main dependency, namely the third-party library implementing the
[OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) protocol.

- `@inrupt/solid-client-authn-node` depends on [`openid-client`](https://github.com/panva/node-openid-client/).
- `@inrupt/solid-client-authn-browser` depends on `@inrupt/oidc-client-ext`. 
`@inrupt/oidc-client-ext` in turn depends on
[`@inrupt/oidc-client`](https://github.com/inrupt/oidc-client-js),
extending it with support for
[DPoP tokens](https://tools.ietf.org/html/draft-ietf-oauth-dpop-01) and 
[Dynamic Client Registration](https://openid.net/specs/openid-connect-registration-1_0.html).

The four modules are available in the standard Lerna [packages directory](./packages).

## OAuth2.0/OpenID Connect

The client libraries aim to help developers authenticate their application users
via the [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html)
protocol (often abbreviated OIDC). OIDC is an industry-wide standard protocol based on the
[OAuth2.0](https://tools.ietf.org/html/rfc6749) framework. In order to understand
how our libraries work internally, some understanding of OAuth/OIDC is definitely preferable.

### A short glossary

Here is a list of terms having a specific meaning in the context of OIDC:
- **Resource Owner**: the user, who owns resources, some of which are private.
The notion of Resource Owner in the OIDC sense is broader than the notion of Pod Owner
in Solid: anyone with a WebID is a Resource Owner.
Whether a particular Resource Owner is **_authorized_** to access a particular Resource
is a different matter, up to the Solid authorization system (e.g., ACP or ACL), which is
outside the scope of this document.
- **Resource Server**: the server hosting resources owned by the Resource Owner.
In our case, a Solid server. A Resource Server receives requests authenticated
with an Access Token. Example: https://pod.inrupt.com. 
- **OIDC issuer**: the Solid Identity Provider, which issues Access Tokens, ID
tokens, and Refresh Tokens. These tokens tell the Resource Server that the user
has control over a certain identity (WebID). The Resource Server can then use that
information to decide whether to give or deny access. 
Example: https://broker.pod.inrupt.com.
- **Client**: the application the Resource Owner uses to access resources on
a Resource Server. Technically, OAuth is a delegation protocol: the Resource Owner
allows the Client to interact with a Resource Server on its behalf. Example: 
https://podbrowser.inrupt.com.

### Solid-OIDC

With the [Solid-OIDC specification](https://solid.github.io/authentication-panel/solid-oidc/), 
Solid extends the OIDC protocol in order to allow it fit better into a decentralized ecosystem,
specifically with Client WebIDs and DPoP tokens:

- Solid-OIDC introduces the notion of Client WebID, which enables
Client-managed identifiers instead of Issuer-managed identifiers. By using identifiers
they control, Clients are no longer required to get their identifiers from the Issuer
through either static or dynamic client registration.

- Solid-OIDC also makes the support for [Key-bound Access Tokens](https://tools.ietf.org/html/draft-fett-oauth-dpop-04)
(referred to as DPoP tokens) mandatory: it is only optional in traditional OIDC, where
Bearer tokens are the default option. DPoP tokens cannot be replayed by a Resource
Server to another Resource Server, which is an important security feature in a
decentralized ecosystem such as Solid's.

### Mapping OIDC flows to the code

#### Unsupported flows

There are some OIDC flows that we intentionally don't plan on supporting:
- The [Implicit flow](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowAuth),
which is widely recognized as having security issues, and doesn't bring value compared
to the Authorization Code flow.
- The Refresh flow **in a browser context**. We do implement the refresh flow for
NodeJS, but there are limitations that prevent it from being applicable in a
browser context:
  - Users must always be prompted when a refresh token is requested, which prevents
  silent authentication.
  - There is no secure place to store the Refresh Token in a browser that would survive a
  page refresh/reload, meaning the token would be completely lost on reload, thereby defeating
  the purpose of having a long-lived token in the first place. The 
  [best security practices document for OAuth](https://tools.ietf.org/html/draft-ietf-oauth-security-topics-18#section-4.13)
  contains some recommendations on handling Refresh Tokens securely.

#### Auth code flow

![Module dependencies](./documentation/diagrams/auth_code_flow.svg)

- Discovery: `packages/*/src/login/oidc/IssuerConfigFetcher.ts`
- Registration: `packages/*/src/login/oidc/ClientRegistrar.ts`
- OIDC handler: `packages/*/src/login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler.ts`
- Handle incoming redirect: `packages/*/src/login/oidc/redirectHandler/*Handler.ts`,
the specific Handler depends on which Handler's `canHandle()` method first returns
`true`.

#### Refresh flow

![Module dependencies](./documentation/diagrams/refresh_flow.svg)

- OIDC handler: `packages/*/src/login/oidc/oidcHandlers/RefreshTokenOidcHandler.ts`

Note that in this case, no redirection happens (i.e., there's only a Backchannel
exchange): the Access Token is received directly in response to a request
containing the Refresh Token.

### Helpful resources

Here are some recommended resources to help understand OAuth/OIDC in general:
- [OAuth 2 in Action](https://www.manning.com/books/oauth-2-in-action), by Justin Richer and Antonio Sanso
- [OAuth masterclass](https://www.youtube.com/watch?v=egfyV2NV9Mw), by Justin Richer
- [How To Securely Implement Authentication in Single Page Applications](https://betterprogramming.pub/how-to-securely-implement-authentication-in-single-page-applications-670534da746f), by Dennis Stötzel

These resources may help in getting a better understanding of the authentication
flows described in the previous section, and in particular by providing relevant
use cases for each flow.

## Codemap of the client library modules

This section will give a high-level description of the shared inner workings of 
`@inrupt/solid-client-authn-node` and `@inrupt/solid-client-authn-browser`,
omitting anything too module-specific.

### The API

Most of the code for these modules is internal and hidden from the developer. The
public API is located in `packages/*/src/Session.ts`. Developers are expected to
instantiate a `Session` object, and to use it to interact with the session.
Usage examples can be found in our
[public documentation](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate/).

### The Handler pattern

Various components, such as the Login and Incoming Redirect components, are based
on the Handler design pattern. Given data contained in a request, a set of classes
implementing a similar API will declare whether or not they may handle said request.

- **Handlers** declare two functions:
  - `canHandle(request)`, which returns a boolean indicating the handler's ability to handle the request
  - `handle(request)`, which actually processes the request
  
- A **Handler Aggregator** tracks all the handlers for a given type of request. The
  Handler Aggregator invokes the first handler for which `canHandle()`   returns
  `true` process the request. The handler aggregator has the same API as the handlers
  it aggregates, and brokers the request to the underlying handlers.
  More on that in the Dependency Injection section.

In the context of this library, a request is an API call to execute some OIDC-related
operation, for instance redirect the Resource Owner to the OIDC issuer, or process
the data sent by the OIDC issuer to the Client. Handlers will determine whether 
they can handle the request based on the options specified by the code snippet making
the call.

#### Login

The login operation is initiated by the Client. It may result in one of the following:
- a redirection of the Resource Owner to the Issuer's authorization endpoint.
- a request by the Client to the Issuer's token endpoint.

Handlers for the login operation are located in `packages/*/src/login/oidc/oidcHandlers/*Handler.ts`.

#### Incoming redirect

The incoming redirect operation is initiated by the Issuer.
At the Issuer webpage, the Resource Owner authenticates (e.g., by entering a username
and a password), after which the Issuer sends them to a webpage under the Client
app's control (specifically its `redirect_uri`). The Issuer appends some very important query 
parameters to the IRI the Resource Owner is redirected to, which are needed by the Client
to complete the login flow. This is done when the developer calls `handleIncomingRedirect()`,
and the Handlers for the incoming redirect are located
in `packages/*/src/login/oidc/redirectHandler/*Handler.ts`.

### Dependency injection

An important architectural component of this library is dependency injection,
implemented here using [TSyringe](https://github.com/Microsoft/tsyringe). Dependencies
are declared in `packages/*/src/dependencies.ts`.

#### Declaring order

The order in which the dependencies sharing the same label are declared **matters**.
Let's have a look at some code to make things clearer.

```
container.register<IOidcHandler>("browser:oidcHandler", {
  useClass: AggregateOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: RefreshTokenOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: AuthorizationCodeWithPkceOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: ClientCredentialsOidcHandler,
});
```

Here, `AggregateOidcHandler` is the handler aggregator (as defined in the Handler
Pattern section), and `RefreshTokenOidcHandler`, `AuthorizationCodeWithPkceOidcHandler`
and `ClientCredentialsOidcHandler` are its underlying handlers. 

Note that the label for the containers of the aggregator and the underlying handlers
differ in the example above:
- `browser:oidcHandler` (without an 's') for the aggregator.
- `browser:oidcHandlers` (with an 's'), for the aggregated handlers.

When receiving a
request, `AggregateOidcHandler` will first invoke its instance of `RefreshTokenOidcHandler`
to check if it can handle it. If so, that instance of `RefreshTokenOidcHandler`
will handle the request, and the instances of `AuthorizationCodeWithPkceOidcHandler`
and `ClientCredentialsOidcHandler` will not be called. This means that it is
important to declare the dependencies from the most specialized to the most generic,
because if a fallback handler that can handle all requests is declared first,
the other more specialized handlers will never be called.

The order in which the `container` object registers dependencies isn't relevant
in the case they are registered with different labels. The
Aggregator implements the class from `packages/core/src/util/handlerPattern/AggregateHandler.ts`,
and uses the `@injectAll` annotation to receive all the handlers registered to a
given container.

#### Mocks and tests

Dependency injection makes the codebase more flexible. Because each component is
presented with its declared dependencies at runtime, it becomes easier to add a
dependency to a component without changing the whole codebase.

However, for testing a component, mocking dependency injection in test code wouldn't
bring any value. Instead, to test the object, construct the object with mocked
dependencies provided to its constructor. For instance, a class such as

```
@injectable()
export default class RefreshTokenOidcHandler implements IOidcHandler {
  constructor(
    @inject("node:tokenRefresher") private tokenRefresher: ITokenRefresher,
    @inject("node:storageUtility") private storageUtility: IStorageUtility
  ) {}
  // ...
```

can be tested as follows: 
```
const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
  someMockedTokenRefresher,
  someMockedStorageUtility
);
```
