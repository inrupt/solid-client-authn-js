# Demo: an authenticated NodeJS script

This demo shows how you can run an authenticated script to interact with your Pod.
Check out the code in `src/authenticatedScript.js` for more details.

Note that until [this issue](https://github.com/solid/node-solid-server/issues/1533)
is resolved, this will not work against NSS. This demo is only intended to work against a compliant
OIDC implementation, such as Inrupt's ESS (e.g. deployed at `https://pod.inrupt.com`).

## Installing the app

To properly install this demo app, first run `npm ci` at the root of the repository, which will trigger
the build of the library. Then, run `npm ci` again, this time in
`packages/node/example/bootstrappedApp/`. You should be all set.

## Getting a token

To get all the credentials needed to authenticate your script, you can `cd src/`,
and then run `node bootstrap.js --oidcIssuer <your identity provider>`. 
This utility script will output to the console an IRI in the domain of your specified
identity provider (e.g. `https://broker.pod.inrupt.com/`) that you should open
in a web browser. There, you should be able to log into your identity provider. Once
logged in, you should be redirected to a page that tells you the required information
has been sent to the boostrap app. If you go back to the terminal, you'll see
your client ID, client secret and refresh token. Save these values for use in the next step.

## Using the token

All you need to do now is to use the credentials obtained from the previous step to get an
access token. `authenticatedScript.js` shows a minimal app issuing an authenticated
request. It expects a number of arguments: 

```
node authenticatedScript.js --clientId <the client id> --clientSecret <the client secret>  --refreshToken <the refresh token> --oidcIssuer <the issuer that issued the token> --resource <the private resource you want to access>
```
