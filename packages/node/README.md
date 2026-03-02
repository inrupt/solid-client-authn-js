# Solid JavaScript authentication for Node.js - solid-client-authn-node

`solid-client-authn-node` is a library designed to authenticate Node.js apps (both scripts and full-blown Web servers) with Solid identity servers.
The main documentation is at the [root of the repository](https://github.com/inrupt/solid-client-authn-js).

## HTTP/2 Support

Node.js `fetch` defaults to HTTP/1.1, which limits concurrent requests to ~6 TCP connections per origin. When interacting with Solid pods, applications frequently issue many requests in parallel (fetching resources, ACLs, containers, profiles, etc.).

This library provides built-in HTTP/2 support that multiplexes all requests to the same origin over a single TCP connection, significantly reducing latency for concurrent workloads.

> **Note:** Browsers already negotiate HTTP/2 transparently. This feature is Node.js-only.

### Using HTTP/2 with Session

Pass `http2: true` when creating a Session. All authenticated and unauthenticated requests made through `session.fetch` will use HTTP/2 multiplexing. Connections are automatically cleaned up on logout.

```typescript
import { Session } from "@inrupt/solid-client-authn-node";
import { getSolidDataset } from "@inrupt/solid-client";

const session = new Session({ http2: true });
await session.login({
  clientId: "...",
  clientSecret: "...",
  oidcIssuer: "https://login.inrupt.com",
});

// These requests multiplex over a single HTTP/2 connection
const [dataset, profile, container] = await Promise.all([
  getSolidDataset(url1, { fetch: session.fetch }),
  getSolidDataset(url2, { fetch: session.fetch }),
  getSolidDataset(url3, { fetch: session.fetch }),
]);

await session.logout(); // Also closes HTTP/2 connections
```

### Standalone HTTP/2 fetch

For use cases outside of `Session` (e.g. unauthenticated requests or custom auth), you can use `createHttp2Fetch` directly:

```typescript
import { createHttp2Fetch } from "@inrupt/solid-client-authn-node";
import { getSolidDataset } from "@inrupt/solid-client";

const h2fetch = createHttp2Fetch();

const dataset = await getSolidDataset(url, { fetch: h2fetch });

// Clean up when done
h2fetch.close();
```

### DPoP and Bearer compatibility

HTTP/2 support works with both DPoP and Bearer token authentication. The `buildAuthenticatedFetch` layer generates per-request DPoP proofs as usual; the HTTP/2 transport is transparent to the auth layer.

## Underlying libraries

`solid-client-authn-node` is based on [`jose`](https://github.com/panva/jose).

## Other Inrupt Solid JavaScript Libraries

[`@inrupt/solid-client-authn-node`](https://www.npmjs.com/package/@inrupt/solid-client-authn-node)is part of a family open source JavaScript libraries designed to support developers building Solid applications.

### Inrupt Solid JavaScript Client Libraries

#### Data access and permissions management - solid-client

[@inrupt/solid-client](https://docs.inrupt.com/client-libraries/solid-client-js/) allows developers to access data and manage permissions on data stored in Solid Pods.

#### Authentication - solid-client-authn

[@inrupt/solid-client-authn](https://github.com/inrupt/solid-client-authn) allows developers to authenticate against a Solid server. This is necessary when the resources on your Pod are not public.

#### Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabulary terms as constants that you just have to import.

## Issues & Help

### Solid Community Forum

If you have questions about working with Solid or just want to share what you’re working on, visit the [Solid forum](https://forum.solidproject.org/). The Solid forum is a good place to meet the rest of the community.

### Bugs and Feature Requests

- For public feedback, bug reports, and feature requests please file an issue via [GitHub](https://github.com/inrupt/solid-client-authn/issues/).
- For non-public feedback or support inquiries please use the [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).

### Node.js Support

See [Inrupt Solid Javascript Client
Libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/#node-js-support).

## Documentation

- [Inrupt documentation Homepage](https://docs.inrupt.com/)
