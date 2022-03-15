# End-2-End Browser Tests

Playwright end-to-end tests for [solid-client-authn.js](https://github.com/inrupt/solid-client-authn-js).
These can be run manually locally, and they also run automatically in CI.

## Running locally

The tests connect to Solid Pods using credentials set as environment variables.
The commands below assume they are being executed in this directory, and that
you have a recent version of Node/npm installed.

Before running the tests, first make sure a client application has been installed,
so that Playwright can run it.

```script
cd ../packages/browser/examples/demoClientApp
npm ci
```

To run the tests, create a `.env.<ENV>.local` file following the `e2e/env/.env.example` model, 
and insert your credentials there. `ENV` is the name of the environment against which
the tests run, see `e2e/env/.env.example` for details. You can also check out
`playwright.config.js` to configure
- which browsers run, and whether they run headless or not
- how the tested application is deployed (command run, port...)

You may need to install some components for playwright to be able to run the 
specified browsers:

```script
cd e2e/browser/
npm ci
npx playwright install --with-deps
```

Finally, you can run the tests with the following command:

```script
cd e2e/browser/
npm run test
```

Note that you can also run the browser-based tests from the root of the project: 

```script
npm run test:e2e:browser
```

## Configuring CI

To change the credentials used in CI, see https://github.com/inrupt/solid-client-authn-js/settings/environments.

When adding new secrets, make sure to also expose them to the CI job using /.github/workflows/e2e-browser.yml.
(Specifically, add them under `env` in the "Run tests" job.)
