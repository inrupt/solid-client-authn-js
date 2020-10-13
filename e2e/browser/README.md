# solid-client-authn-testcafe
TestCafe end-to-end tests for [solid-client-authn.js](https://github.com/inrupt/solid-client-authn-js). These are run automatically in CI.

## Running locally

The tests connect to a Solid Pod using credentials set as environment variables.
The commands below assume they are executed in this directory, and that you have a recent version of Node/npm installed.

To run the ESS tests, insert your credentials into the following command:

  E2E_GITHUB_USERNAME=<GitHub username> E2E_GITHUB_PASSWORD=<GitHub password> npx testcafe all ess.test.ts

(Replace `all` with e.g. `chrome` or `firefox` to only run it in a specific browser.)

Likewise, the NSS tests can be run by inserting your credentials in the following command:

  E2E_NSS_USERNAME=<NSS username> E2E_NSS_PASSWORD=<NSS password> npx testcafe all nss.test.ts

## Configuring CI

To change the credentials used in CI, see https://github.com/inrupt/solid-client-authn-js/settings/secrets/.

When adding new secrets, make sure to also expose them to the CI job using /.github/workflows/e2e-browser.yml.
(Specifically, add them under `env` in the "Run tests" job.)

# Notes by Kevin

## Login
TestCafe allows defined tests to be executed with different authentications through the use of [Roles](https://devexpress.github.io/testcafe/documentation/guides/advanced-guides/authentication.html). However, when Roles were implemented for the solid-client-authn-browser test application, the application does not render after being redirected back from the Broker and shows the following error in the browser console:

```
Uncaught (in promise) Error: Field [sessionId] for user [1ff42712103649afa3a0267ac80e8f35] is not stored
   at StorageUtilityBrowser.getForUser (StorageUtility.js:72)
   at async AuthCodeRedirectHandler.handle (AuthCodeRedirectHandler.js:59)
   at async Session.handleIncomingRedirect (Session.js:34)
```

Attempting to store the Local Storage between redirects, as proposed [here](https://github.com/DevExpress/testcafe/issues/2142#issuecomment-367618275), did not solve the issue.

Hence, a [Login Helper](../helperslogin.js) was implemented that allows login by Google, Twitter, or Github, as the expense of need to perform the full login workflow at the start of each test.

## Tests
The solid-client-authn-browser test application attempts to fetch resources based on particular authentications. To provide flexibility, the resources to fetch together with expected responses are stored in `resources.json`.

## To Do
* Implement a method whereby the expected response can be dynamically determined based on a particular authentication.
