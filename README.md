# Solid Authenticator

__WARNING: The API in this library is a work in progress. Expecrt breaking changes in the future__

This is a monorepo that contains projects related to solid authenticator:

 - @solid/authenticator-node: A nodejs implementation of Solid Authenticator
 - @solid/authenticator-browser: A browser implementation of the Solid Authenticator
 - @solid/authenticator-core: The core libraries used by various implementations of Solid Authenticator

## Running in the Web Browser

Currently this library only supports logging in via the web browser.

### Running via the Script tag

If you wish to use the script tag to include authenticator as a dependency, you can use the global variable `solidAuthenticator` as seen below:

```html
<html>
  <head>
    <title>Solid Authenticator Test Page</title>
    <script src="solid-authenticator.bundle.js"></script>
    <script>
      function loginUser() {
        solidAuthenticator.login({
          oidcIssuer: new URL('http://localhost:9001')
        })
      }
      function fetch() {
        solidAuthenticator.fetch('http://localhost:9001/storage', {})
          .then((result) => {
            result.text().then((text) => {
              document.getElementById("fetchResult").value = text
            })
          })
          .catch((err) => {
            console.error(err)
          })
      }
    </script>
  </head>
  <body>
    <h1>Solid Authenticator Test Page</h1>
    <button onclick="loginUser()" id="loginButton">Log In</button>
    <br />
    <br />
    <button onclick="fetch()" id="fetchButton">Fetch</button>
    <br />
    <textarea id="fetchResult"></textarea>
  </body>
</html>
```

### Running via Import

```js
import Authenticator from '@solid/authenticator-browser';

// Create a new instance of the Authenticator
const authenticator = Authenticator()

function loginUser() {
  // Kick off the login process
  authenticator.login({
    oidcIssuer: new URL('http://localhost:9001')
  })
}
function fetch() {
  // Once you're logged in, make a request
  authenticator.fetch('http://localhost:9001/storage', {})
    .then((result) => {
      result.text().then((text) => {
        document.getElementById("fetchResult").value = text
      })
    })
    .catch((err) => {
      console.error(err)
    })
}
```

## Development

Clone the repo here:
```bash
git clone https://github.com/inrupt/solid-auth-client-rewrite/
```

Using lerna, install the dependencies
```bash
npm i
npm run bootstrap
```

You can test various aspects of the code by running one of these commands
```bash
npm run test # Runs all tests
npm run unit-test # Runs only unit tests in all packages
npm run acceptance-test # Runs only acceptance tests in all packages
npm run core-test # Runs all unit tests in the core library
npm run core-unit-test # Runs only unit tests in the core library
npm run browser-test # Runs all tests in the browser library
npm run browser-unit-test # Runs only the unit tests in the browser library
npm run browser-acceptance-test # Runs only the acceptance tests in the browser library
npm run node-test # Runs all tests in the node library
npm run node-unit-test # Runs only the unit tests in the node library
npm run node-acceptance-test # Runs only the acceptance tests in the node library
```

To make development easier, you can stand up the dev server for the browser implementation:
```bash
npm run browser-dev
```

## Architecture

This package follows the following architecture:
![solid authenticator architecture](/sampleFlows/SolidAuthClientArchitecture.png)
