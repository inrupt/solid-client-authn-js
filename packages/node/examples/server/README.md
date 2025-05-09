# Demo: a server-side NodeJS application managing multiple sessions

This demo shows how you can run a NodeJS server with multiple sessions in parallel.
Check out the code in `src/serverSideApp.mjs` for more details.

Note that until [this issue](https://github.com/solid/node-solid-server/issues/1533)
is resolved, this will not work against NSS. This demo is only intended to work
against a compliant OIDC implementation, such as Inrupt's ESS. A developer version
of ESS is available on [PodSpaces](https://start.inrupt.com/).

## Installing the app

To install this demo app, 
1. run `npm ci` and `npm run build` at the root of the repository,
  which will trigger the build of the libraries our app depends on.
2. If you want to customize the Client ID or the OpenID Provider being
  used, change the content of .env.example. 

## Running the app

Run `node --env-file=.env.example src/serverSideApp.mjs`

Four endpoints are available:
- `/login`, to initiate the login process against a Solid Identity Provider
  (by default, `https://login.inrupt.com`)
- `/redirect`, where the Solid Identity Provider will redirect users after login
- `/fetch`, where you have to pass a `resource=<some resource>` query param in
  order to fetch a resource (protected resources will require you be logged in and to have been granted READ access to that resource, whereas public resources can be fetched whether you're logged in or not)
- `/logout`, to log out of the session
