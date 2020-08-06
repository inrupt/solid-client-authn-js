# Solid JavaScript Authentication - solid-client-authn

`solid-client-authn` is a set of libraries designed to authenticate with Solid identity servers. 
The libraries share a common API and include different modules for different deployment environments:
- `solid-client-authn-browser` can be used to help build web apps in the browser.
- `solid-client-authn-node` is **planned** to help build server-side and console-based apps.

@inrupt/solid-client-authn libraries are part of a family open source JavaScript libraries designed to support developers building Solid applications.

# Inrupt Solid JavaScript Client Libraries

## Data access and permissions management - solid-Client

[@inrupt/solid-client](https://github.com/inrupt/solid-client-js) allows developers to access data and manage permissions on data stored in Solid Pods.

## Authentication - solid-client-authn

[@inrupt/solid-client-authn](https://github.com/inrupt/solid-client-authn) allows developers to authenticate against a Solid server. This is necessary when the resources on your Pod are not public.

## Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabularies available as constants that you just have to import.

# Authentication libraries

The different `solid-client-authn` libraries all share the same interface ([see API reference](./docs/api.md)). `solid-client-authn` includes two APIs for building applications: a "Single Session API" and a "Multi Session API".

# Installation

For the latest stable version of solid-client:

```bash
npm install @inrupt/solid-client
```

For the latest stable version of all Inrupt Solid JS libraries:

```bash
npm install @inrupt/solid-client @inrupt/solid-client-authn-browser @inrupt/vocab-common-rdf
```

## Usage
### Single session API

`solid-client-authn`'s single session API is designed to provide a streamlined experience when implementing authentication in apps that focus on just one user.
You'd use the single session API to:

  - Create a single page web application that only one user logs into at a time.
  - Make a bot that only represents one user.
  - Build a mobile application that only one user logs into at a time.
  
#### Examples

 - [Single-session the web browser with your own bundler](./examples/single/bundle)

### Multi Session API

`solid-client-authn`'s "Multi Session API" allows you to manage multiple sessions for multiple logged in users at the same time. You'd use the multi session API to:

 - Create a web application with a server side component. While one user may be logged into each individual client, the server will need to manage all logged in users.
 - Make a bot that needs to operation on behalf of multiple users.
 - You have a single page application, but you want to maintain credentials on the server for security.
 - You want to log in multiple identities for either a single human user, or multiple users.

### Setting up the examples

```bash
git clone https://github.com/inrupt/solid-client-authn.git
cd solid-client-authn
npm ci
npm run bootstrap-examples
# Run each example from the root
## single session API, bundler mode
cd examples/single/bundle
npm run start
## single session API, script mode
cd examples/single/script
npm run start
```

At this point, a test application will be running on port `3001`.
Be sure that you enter a valid Solid issuer before logging in
, for example: `https://identity.demo-ess.inrupt.com`.

# Issues & Help

## Solid Community Forum

If you have questions about working with Solid or just want to share what you’re working on, visit the [Solid forum](https://forum.solidproject.org/). The Solid forum is a good place to meet the rest of the community.

## Bugs and Feature Requests

- For public feedback, bug reports, and feature requests please file an issue via [Github](https://github.com/inrupt/solid-client-authn/issues/).
- For non-public feedback or support inquiries please use the [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).

## Documentation

* [Using the libraries from within the browser](./docs/browser.md)
* [Inrupt documentation Homepage](https://docs.inrupt.com/)
