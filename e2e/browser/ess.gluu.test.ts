// Page Models
import FetchPage from "./page-models/FetchPage";

// Helpers
import { essGluuLogin } from "./helpers/login";
import ITestConfig from "./ITestConfig";

const testSuite = require("./test-suite.json");

const applicationUrl =
  process.env.DEMO_CLIENT_APP_URL ??
  "https://solid-client-authn-js-atdw4zl4r.vercel.app/demo/";
// "http://localhost:3001";

const testUserName = process.env.E2E_USER_NAME;
const testUserPassword = process.env.E2E_USER_PASSWORD;

// Fetch Tests
fixture(`Automated tests using client application: [${applicationUrl}]`)
  //.disablePageCaching
  //.disablePageReloads
  .page(applicationUrl);

// Run through all the tests in our test suite.
testSuite.testList.forEach((data: ITestConfig) => {
  console.log(`Got: [${data.name}]`);

  test(`Test: [${data.name}]`, async (t) => {
    if (data.performLogin) {
      await essGluuLogin(
        testSuite.identityProvider,
        testUserName,
        testUserPassword
      );

      // Authorize our client application to access Pod resources.
      await t.click("[name=authorize]");
      // await t.wait(1000);
      await t.expect(FetchPage.fetchButton.exists).ok("Logged in");
    }

    // Template for WebID structure should really be server implementation
    // dependent, but this is the template at the moment.
    const podRoot = `${testSuite.podResourceServer}${testUserName}`;
    const resourceToGet = data.resourceToGet.replace("<POD ROOT>", podRoot);

    await t
      .selectText(FetchPage.fetchUriTextbox)
      .typeText(FetchPage.fetchUriTextbox, resourceToGet)
      .click(FetchPage.fetchButton)
      .wait(2000);
    // .expect(FetchPage.fetchResponseTextbox.textContent).contains(data.response, "Valid response");

    const responseBody = await FetchPage.fetchResponseTextbox.textContent;
    console.log(`Text: [${responseBody}]...`);
    // await t.expect(responseBody).contains("Top secret access code!", "Valid response");
    await t.expect(responseBody).contains(data.expectResponseContains, "Valid response");
  });
});
