# Solid JavaScript Authentication - solid-client-authn

`solid-client-authn` is a suite of libraries designed to authenticate against Solid resource servers.
The libraries share a common API and include different modules for different deployment environments:

- `solid-client-authn-browser` can be used to build web apps in the browser.
- `solid-client-authn-node` is **planned** to build server-side and console-based apps. (NOT AVAILABLE YET)

@inrupt/solid-client-authn libraries are part of a suite open source JavaScript libraries designed to support developers building Solid applications.

# Inrupt Solid JavaScript Client Libraries

## Data access and permissions management - solid-client

[@inrupt/solid-client](https://docs.inrupt.com/client-libraries/solid-client-js/) allows developers to access data and manage permissions on data stored in Solid Pods.

## Authentication - solid-client-authn-browser
[@inrupt/solid-client-authn-browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser) allows apps running on a browser to authenticate against a Solid server. This is necessary when the resources on your Pod are not public.

## Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabularies available as constants that you just have to import.

# Installation

For the latest stable version of solid-client-authn-browser:

```bash
npm install @inrupt/solid-client-authn-browser
```

For the latest stable version of all Inrupt Solid JavaScript libraries:

```bash
npm install @inrupt/solid-client @inrupt/solid-client-authn-browser @inrupt/vocab-common-rdf
```

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

- [Using Inrupt Solid JavaScript Client Libraries to authenticate](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate/)
- [Inrupt documentation Homepage](https://docs.inrupt.com/)

## How to run the test client login app?

```shell
git clone https://github.com/inrupt/solid-client-authn-js
cd solid-client-authn-js
npm ci
cd packages/browser/examples/single/bundle/
npm run start
```

Go to http://localhost:3001/.
