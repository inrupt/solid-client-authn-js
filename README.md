# solid-client-authn

`solid-client-authn` is a set of libraries designed to authenticate with Solid identity servers,
and thereafter to make authenticated requests to Solid storage servers from JavaScript clients
deployed in any environment. The `solid-client-authn` libraries all have a common API
, and come in different modules intended for different deployment environments:
- `solid-client-authn-browser` can be used to help build web apps in the browser.
- `solid-client-authn-node` is **planned** to help build server-side apps and console-based scripts.

## Using the Appropriate API

The different `solid-client-authn` libraries all share the same interface ([see API reference](./docs/api.md)). `solid-client-authn` includes two APIs for building applications: a "Single Session API" and a "Multi Session API".

### When to use the "Single Session API"

`solid-client-authn`'s "Single Session API" is designed to provide a streamlined experience
when implementing authentication in apps that focus on just one user.
You'd use the single session API to:

 - Create a single page web application that only one user logs into at a time.
 - Make a bot that only represents one user.
 - Build a mobile application that only one user logs into at a time.

#### Examples Usage

 - [Single-session the web browser with your own bundler](./examples/single/bundle)

### When to use "Multi Session API"

`solid-client-authn`'s "Multi Session API" allows you to manage multiple sessions for multiple
logged in users at the same time. You'd use the multi session API to:

 - Create a web application with a server side component. While one user may be logged into
 each individual client, the server will need to manage all logged in users.
 - Make a bot that needs to operation on behalf of multiple users.
 - You have a single page application, but you want to maintain credentials on the server
 for security.
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

## Environment-specific documentation

- [For the browser](./docs/browser.md)
