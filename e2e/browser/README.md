# End-2-End Browser Tests

TestCafe end-to-end tests for [solid-client-authn.js](https://github.com/inrupt/solid-client-authn-js).
These can be run manually locally, or automatically in CI.

## Running locally

The tests connect to Solid Pods using credentials set as environment variables.
The commands below assume they are being executed in this directory, and that
you have a recent version of Node/npm installed.

Before running the tests, first make sure a client application has been installed,
so that Testcafe can run it.

```script
cd ../packages/browser/examples/demoClientApp
npm ci
```

To run the tests, create a `.env.test.local` file following the `.env.example` model, 
and insert your credentials there. You can also check out `.testcaferc.json`, to
configure which browsers run.

Finally, you can run the tests with the following command:

```script
npm run test
```

You can also specify the location of a deployed demo client application - for
example, if you were running that application on `localhost:3001` (which is the
default used if no environment variable is set), then you could use that
application for the tests by including in `.env.test.local`:

```
DEMO_CLIENT_APP_URL="http://localhost:3001"
```

## Configuring CI

To change the credentials used in CI, see https://github.com/inrupt/solid-client-authn-js/settings/secrets/.

When adding new secrets, make sure to also expose them to the CI job using /.github/workflows/e2e-browser.yml.
(Specifically, add them under `env` in the "Run tests" job.)

# Notes by Kevin

## Login

TestCafe allows defined tests to be executed with different authentications
through the use of [Roles](https://devexpress.github.io/testcafe/documentation/guides/advanced-guides/authentication.html).
However, when we implemented Roles, the application did not render after being
redirected back from the Solid Identity Provider, and threw the following error
in the browser console:

```
Uncaught (in promise) Error: Field [sessionId] for user [1ff42712103649afa3a0267ac80e8f35] is not stored
   at StorageUtilityBrowser.getForUser (StorageUtility.js:72)
   at async AuthCodeRedirectHandler.handle (AuthCodeRedirectHandler.js:59)
   at async Session.handleIncomingRedirect (Session.js:34)
```

Attempting to store the Local Storage between redirects, as proposed [here](https://github.com/DevExpress/testcafe/issues/2142#issuecomment-367618275),
did not solve the issue.

Hence, a [Login Helper](../helperslogin.js) was implemented that allows login by
Google, Twitter, or Github, as the expense of need to perform the full login
workflow at the start of each test.

## Tests

The solid-client-authn-browser test application attempts to fetch resources
based on particular authentications. To provide flexibility, the resources to
fetch together with expected responses are stored in `resources.json`.

## To Do

- Implement a method whereby the expected response can be dynamically determined
based on a particular authentication.
