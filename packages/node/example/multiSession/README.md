# Demo: a server-side NodeJS application managing multiple sessions

This demo shows how you can run a NodeJS server with multiple sessions in parallel.
Check out the code in `src/serverSideApp.ts` for more details.

Note that until [this issue](https://github.com/solid/node-solid-server/issues/1533)
is resolved, this will not work against NSS. This demo is only intended to work 
against a compliant OIDC implementation, such as Inrupt's ESS (e.g., deployed at
`https://pod.inrupt.com`).

## Installing the app

To install this demo app, first run `npm ci` at the root of the repository, which
will trigger the build of the libraries our app depends on. Then, run `npm ci` 
again, this time in `packages/node/example/multiSession/`, and then `npm run build`.
You should be all set. If you change the code, make sure to re-run `npm run build`
before you re-run it.

## Running the app

Running `node dist/serverSideApp.js` starts the server. Four endpoints are then available:
- `/login`, to initiate the login process against a solid Identity Provider 
(by default, `https://broker.pod.inrupt.com`)
- `/redirect`, where the Solid Identity Provider will redirect users after login
- `/fetch`, where you have to pass a `resource=<some resource>` query param in 
order to fetch a resource
- `/logout`, to log out of the session