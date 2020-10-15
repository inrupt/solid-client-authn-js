/*
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import FetchPage from "./page-models/FetchPage";

import { essGluuLogin, nssLogin } from "./helpers/login";
import ITestConfig from "./ITestConfig";
import IPodServerConfig from "./IPodServerConfig";

// Could probably provide this via a system environment variable too...
const testSuite = require("./test-suite.json");

// This is the deployed client application that we'll be using to exercise
// various authentication scenarios. We expect the system environment value to
// point at a deployed instance (e.g. an automatic Vercel deployment), but I
// don't think it makes sense to default to a hard-coded Vercel instance.
// Instead, for running locally, it seems helpful to default to 'localhost'
// instance.
const clientApplicationUrl =
  process.env.DEMO_CLIENT_APP_URL ?? "http://localhost:3001";

fixture(`Automated tests using client application: [${clientApplicationUrl}]`)
  //.disablePageCaching
  //.disablePageReloads
  .page(clientApplicationUrl);

async function performLogin(server: IPodServerConfig, testUserName: string) {
  const testUserPassword = process.env[server.envTestUserPassword];

  switch (server.loginMechanism) {
    case "essGluu":
      await essGluuLogin(
        server.identityProvider,
        testUserName,
        testUserPassword
      );
      break;

    case "nss":
      await nssLogin(server.identityProvider, testUserName, testUserPassword);
      break;

    default:
      throw new Error(
        `Unknown login mechanism in test suite configuration: [${server.loginMechanism}]`
      );
  }
}

// Run through all the tests defined in our test suite.
testSuite.podServerList.forEach((server: IPodServerConfig) => {
  const testUserName = process.env[server.envTestUserName] as string;

  testSuite.testList.forEach((data: ITestConfig) => {
    test(`Test: [${server.loginMechanism}] [${data.name}]`, async (t) => {
      if (data.performLogin) {
        await performLogin(server, testUserName);
      }

      const podRoot = server.podResourceServer.replace(
        "<TEST USER NAME>",
        testUserName
      );
      const resourceToGet = data.resourceToGet.replace("<POD ROOT>", podRoot);
      console.log(
        `Pod root: [${podRoot}], resource to get: [${resourceToGet}]`
      );

      await t
        .selectText(FetchPage.fetchUriTextbox)
        .typeText(FetchPage.fetchUriTextbox, resourceToGet)
        .click(FetchPage.fetchButton)
        .wait(2000);

      const responseBody = await FetchPage.fetchResponseTextbox.textContent;
      console.log(`Text: [${responseBody}]...`);

      const expected = data.expectResponseContainsAnyOf.some((option) =>
        responseBody.includes(option)
      );

      await t.expect(expected).ok();
    });
  });
});
