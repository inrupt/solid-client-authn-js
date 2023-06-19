# Demo: an authenticated NodeJS script

This demo shows how you can run an authenticated script to interact with your Pod.
Check out the code in `src/authenticatedScript.ts` for more details.

Note that until [this issue](https://github.com/solid/node-solid-server/issues/1533)
is resolved, this will not work against NSS. This demo is only intended to work against a compliant
OIDC implementation, such as Inrupt's ESS (e.g. deployed at `https://login.inrupt.com`).

## Installing the app

To properly install this demo app, first run `npm ci` at the root of the repository, which will trigger
the build of the library. Then, run `npm ci` again, this time in
`packages/node/example/bootstrappedApp/`, and then `npm run build`. You should be all set.

## Registering the application

In order for the application to act on your behalf, you will need to register it
to your Identity Provider. See [our documentation](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-client/) on how to do this using Inrupt's Identity Provider. Registering
the client will result in a `client_id` and `client_secret` being issued by the
Identity Provider, and being bound to your WebID.

## Using the token

All you need to do now is to use the credentials obtained from the previous step to get an
access token. `authenticatedScript.js` shows a minimal app issuing an authenticated
request. It expects a number of arguments to run:

```
node dist/authenticatedScript.js --clientId <the client id> --clientSecret <the client secret>  --oidcIssuer <the issuer that issued the token> --resource <the private resource you want to access>
```
