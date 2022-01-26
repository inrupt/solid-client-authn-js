# Solid JavaScript authentication for the browser - solid-client-authn-browser

`solid-client-authn-browser` is a library designed to authenticate web apps (in the browser) with Solid identity servers.
The main documentation is at the [root of the repository](https://github.com/inrupt/solid-client-authn-js).

## Required polyfills

Our JavaScript Client Libraries use relatively modern JavaScript features that
will work in all commonly used browsers, except Internet Explorer. Additionally,
`@inrupt/solid-client-authn-browser` currently expects the Node.js `events`
module. Webpack versions before version 5 used to add a polyfill for that by
default; if you do not use Webpack, or use version 5 or later, please install
the `events` npm package as well.

## Underlying libraries

`solid-client-authn-browser` is based on [`oidc-client-js`](https://github.com/IdentityModel/oidc-client-js), forked in
[`@inrupt/oidc-client`](https://github.com/inrupt/oidc-client-js) after the original library stopped being supported.
However, the latter lacks some features that are necessary to provide the developer experience we specifically want for the Solid ecosystem, so we developed [`oidc-client-ext`](https://www.npmjs.com/package/@inrupt/oidc-client-ext) to add these features.

# Other Inrupt Solid JavaScript Libraries

[`@inrupt/solid-client-authn-browser`](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser)is part of a family open source JavaScript libraries designed to support developers building Solid applications.

## Inrupt Solid JavaScript Client Libraries

### Data access and permissions management - solid-client

[@inrupt/solid-client](https://docs.inrupt.com/client-libraries/solid-client-js/) allows developers to access data and manage permissions on data stored in Solid Pods.

### Authentication - solid-client-authn

[@inrupt/solid-client-authn](https://github.com/inrupt/solid-client-authn) allows developers to authenticate against a Solid server. This is necessary when the resources on your Pod are not public.

### Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabulary terms as constants that you just have to import.

# Issues & Help

## Solid Community Forum

If you have questions about working with Solid or just want to share what you’re working on, visit the [Solid forum](https://forum.solidproject.org/). The Solid forum is a good place to meet the rest of the community.

## Bugs and Feature Requests

- For public feedback, bug reports, and feature requests please file an issue via [GitHub](https://github.com/inrupt/solid-client-authn/issues/).
- For non-public feedback or support inquiries please use the [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).

## Prerequisite

The `solid-client-authn` libraries are compatible with [NSS](https://github.com/solid/node-solid-server/releases/tag/v5.3.0) 5.3.X and higher.

## Documentation

- [Using this library from within the browser](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate/)
- [Inrupt documentation Homepage](https://docs.inrupt.com/)
