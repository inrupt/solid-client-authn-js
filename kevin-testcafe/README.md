# solid-client-authn-testcafe
TestCafe end-to-end tests for [solid-client-authn.js](https://github.com/inrupt/solid-client-authn-js).

# Install TestCafe
To install TestCafe, follow the instructions [here](https://devexpress.github.io/testcafe/documentation/guides/basic-guides/install-testcafe.html).

## TestCafe testing-library
The TestCafe code uses the [TestCafe Testing Library](https://testing-library.com/docs/testcafe-testing-library/intro) to improve the selection of page elements. To install, follow the instructions [here](https://testing-library.com/docs/testcafe-testing-library/intro).

# Test Execution
The TestCafe tests are stored in a folder `/tests`. These tests can be executed from the command line.

To execute all implemented tests:
```
> testcafe <browser> ./tests
```

To execute all tests within a single file:
```
> testcafe <browser> ./tests/<filename>
```

To execute a test with a specific name in a file:
```
> testcafe <browser> ./tests/<filename> -t "<Test Name>"
```

# Command Line Parameters

## Installed Browsers
To determine the browsers that can be used for testing, execute:
```
> testcafe --list-browsers
```

# Developer Notes

## Test Variables
The variables controling the test are stored in `./variables.js`. Edit as appropriate.

## Test Files
To populate the test Pod, upload:
* `/files/private.txt` to `https://<pod>/private/private.txt`
* `/files/public.txt` to `https://<pod>/public/public.txt`

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
The solid-client-authn-browser test application attempts to fetch resources based on particular authentications. To provide flexibility, the resources to fetch together with expected responses are stored in `/tests/resources.json`.

## To Do
* Implement a method whereby the expected response can be dynamically determined based on a particular authentication.