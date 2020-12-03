# Demo: authenticated a NodeJS script

This demo shows how you can run an authenticated script to interact with your Pod.
Check out the code in `src/app.js` for more details.

Note that until [this issue](https://github.com/solid/node-solid-server/issues/1533)
is resolved, this does not work against NSS, and only works against a compliant
OIDC implementation, such as Inrupt's ESS (e.g. deployed at `https://pod.inrupt.com`).

## Installing the app

To use the app, first run `npm ci` at the root of the repository: it will trigger
the build of the library. Then, run `npm ci` again, this time in
`packages/node/example/bootstrappedApp/`. You should be all set.

## Getting a token

To get all the credentials needed to authenticate your script, you can `cd src/`,
and then run `node bootstrap.js --oidcProvider <your identity provider>`. 
This utility script will show in the console an IRI in the domain of your favorite
identity provider (e.g. `https://broker.pod.inrupt.com/`) that you should open
in a web browser. There, you should be able to log in your identity provider. Once
logged in, you should be redirected to a page that tells you the required information
has been sent to the boostrap app. If you go back to the terminal, you'll see
your client ID, secret and refresh token. Save those.

## Using the token

All you have to do now is to use the credentials previously obtained to get an
access token. `app.js` shows a minimal app issuing an authenticated request. It
expects a couple of arguments: 

```
node app.js --id <the client id> --secret <the client secret>  --token <the refresh token> --issuer <the issuer that issued the token> --resource <the private resource you want to access>
```