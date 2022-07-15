# Solid JavaScript authentication for Node.js - solid-client-authn-node

**This is a fork of [inrupt/solid-client-authn-js](https://github.com/inrupt/solid-client-authn-js) that includes support for [Web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).**
**If you don't need Web worker support, it is recommended to use Inrupt's original [inrupt/solid-client-authn-js](https://github.com/inrupt/solid-client-authn-js) packages.**
_The motivation for this fork can be found here: https://github.com/rubensworks/solid-client-authn-js/pull/1802_

`solid-client-authn-node` is a library designed to authenticate Node.js apps (both scripts and full-blown Web servers) with Solid identity servers.
The main documentation is at the [root of the repository](https://github.com/rubensworks/solid-client-authn-js).

## Underlying libraries

`solid-client-authn-node` is based on [`jose`](https://github.com/panva/jose).

# Other Inrupt Solid JavaScript Libraries

<<<<<<< HEAD

# [`@inrupt/solid-client-authn-node`](https://www.npmjs.com/package/@inrupt/solid-client-authn-node)is part of a family open source JavaScript libraries designed to support developers building Solid applications.

[`@rubensworks/solid-client-authn-node`](https://www.npmjs.com/package/@rubensworks/solid-client-authn-node)is part of a family open source JavaScript libraries designed to support developers building Solid applications.

> > > > > > > 6df43277 (Prepare repo for fork publication)

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

This library requires at least:

- Node.js >= 14
- npm >= 8.7
  **Note**: We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage your node version.

The `solid-client-authn` libraries are compatible with [NSS](https://github.com/solid/node-solid-server/releases/tag/v5.3.0) 5.3.X and higher.

## Documentation

- [Inrupt documentation Homepage](https://docs.inrupt.com/)
