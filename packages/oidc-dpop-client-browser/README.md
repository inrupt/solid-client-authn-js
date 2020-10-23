# oidc-dpop-client-browser

This library is built on top of `oidc-client-js`, and adds the following features to it: 
- Dynamic client registration
[Dynamic Client Registration](https://openid.net/specs/openid-connect-registration-1_0.html) is part of the [OpenID](https://openid.net) specification and it allows OAuth client applications to dynamically register with an OAuth server.
To learn more about how this works, you can have a look at [this page](https://curity.io/resources/architect/openid-connect/openid-connect-understanding-dcr/)

- DPoP tokens for authentication
[DPoP](https://oauth.net/2/dpop/), or Demonstration of Proof of Possession, is part of the [OAuth 2.0](https://oauth.net/2/) spec and is an extension that describes a technique to cryptographically bind access tokens to a particular client when they are issued. This is one of many attempts at improving the security of Bearer Tokens by requiring the application using the token to authenticate itself.

This [proposed standard](https://tools.ietf.org/html/draft-fett-oauth-dpop-04) is still in draft status.
To learn more about how this works, you can have a look at [this page](https://curity.io/resources/architect/oauth/dpop-overview/)

# Other Inrupt Solid JavaScript Libraries
[@inrupt/oidc-dpop-client-browser](https://www.npmjs.com/package/@inrupt/oidc-dpop-client-browser )is part of a family open source JavaScript libraries designed to support developers building Solid applications.

# Solid JavaScript Authentication - solid-client-authn

`solid-client-authn` is a set of libraries designed to authenticate with Solid identity servers.
The libraries share a common API and include different modules for different deployment environments:

- `solid-client-authn-browser` can be used to help build web apps in the browser.
- `solid-client-authn-node` is **planned** to help build server-side and console-based apps.

@inrupt/solid-client-authn libraries are part of a family open source JavaScript libraries designed to support developers building Solid applications.

# Inrupt Solid JavaScript Client Libraries

## Data access and permissions management - solid-client

[@inrupt/solid-client](https://docs.inrupt.com/client-libraries/solid-client-js/) allows developers to access data and manage permissions on data stored in Solid Pods.

## Authentication - solid-client-authn

[@inrupt/solid-client-authn](https://github.com/inrupt/solid-client-authn) allows developers to authenticate against a Solid server. This is necessary when the resources on your Pod are not public.

## Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabularies available as constants that you just have to import.

# Issues & Help

## Solid Community Forum

If you have questions about working with Solid or just want to share what you’re working on, visit the [Solid forum](https://forum.solidproject.org/). The Solid forum is a good place to meet the rest of the community.

## Bugs and Feature Requests

- For public feedback, bug reports, and feature requests please file an issue via [GitHub](https://github.com/inrupt/solid-client-authn/issues/).
- For non-public feedback or support inquiries please use the [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).

## Prerequisite

Any of the `solid-client-authn` libraries require at least:

- NodeJS 12.X.Y
- npm 6.14.X
  **Note**: We recommand using [nvm](https://github.com/nvm-sh/nvm) to manage your node version

The `solid-client-authn` libraries are compatible with [NSS](https://github.com/solid/node-solid-server/releases/tag/v5.3.0) 5.3.X and higher.

## Documentation

- [Using the libraries from within the browser](./docs/browser.md)
- [Inrupt documentation Homepage](https://docs.inrupt.com/)
