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

import { Selector, t } from "testcafe";
import FetchPage from "./page-models/FetchPage";

import { loginGluu, loginNss } from "./helpers/login";
import ITestConfig from "./ITestConfig";
import IPodServerConfig from "./IPodServerConfig";
import { authorizeEss, authorizeNss } from "./helpers/authorizeClientApp";
import LoginPage from "./page-models/LoginPage";

// Could probably provide this via a system environment variable too...
const testSuite = require("./test-suite.json");

// This is the deployed client application that we'll be using to exercise
// various authentication scenarios. We expect the system environment value to
// point at a deployed instance (e.g. an automated Vercel deployment), but I
// don't think it makes sense to default to a hard-coded Vercel instance.
// Instead, for running locally, it seems helpful to default to 'localhost'
// instance.
const clientApplicationUrl =
  process.env.E2E_DEMO_CLIENT_APP_URL ?? "http://localhost:3001";

const testCafeWaitTime: string = process.env.E2E_TESTCAFE_WAIT_TIME ?? "2000";

fixture(
  `Automated tests using client application: [${clientApplicationUrl}]`
).page(clientApplicationUrl);

async function selectBrokeredIdp(brokeredIdp: string) {
  const selectIdp = await Selector("h2").withText("How would you like to login")
    .exists;

  if (selectIdp) {
    console.log(
      `Got multiple Identity Providers to choose from: trying [${brokeredIdp}]...`
    );
    await t.click(`[alt=${brokeredIdp}]`);
  } else {
    console.log(
      `No Identity Provider selections offered - assuming provider is [${brokeredIdp}]!`
    );
  }
}

async function performLogin(
  podServerConfig: IPodServerConfig,
  testUserName: string
) {
  const testUserPassword = process.env[podServerConfig.envTestUserPassword];

  await LoginPage.submitLoginForm(podServerConfig.identityProvider);

  await t.wait(parseInt(testCafeWaitTime, 10));
  await selectBrokeredIdp(podServerConfig.brokeredIdp);

  switch (podServerConfig.brokeredIdp) {
    case "Gluu":
      await loginGluu(testUserName, testUserPassword as string);
      break;

    case "nss":
      await loginNss(testUserName, testUserPassword as string);
      break;

    default:
      throw new Error(
        `Unknown login mechanism in test suite configuration: [${podServerConfig.brokeredIdp}]`
      );
  }

  switch (podServerConfig.authorizeClientAppMechanism) {
    case "ess":
      await authorizeEss();
      break;

    case "nss":
      await authorizeNss();
      break;

    default:
      throw new Error(
        `Unknown login mechanism in test suite configuration: [${podServerConfig.authorizeClientAppMechanism}]`
      );
  }

  await t.wait(parseInt(testCafeWaitTime, 10));
  await t.expect(FetchPage.fetchButton.exists).ok("Logged in");
}

// Run through all the tests defined in our test suite.
testSuite.podServerList.forEach((server: IPodServerConfig) => {
  const testUserName = process.env[server.envTestUserName] as string;

  if (!testUserName || testUserName.trim().length === 0) {
    test(`Pod Server - IdP [${server.description}], no environment variable set for [${server.envTestUserName}], so skipping this server.`, async (t) => {});
  } else {
    testSuite.testList.forEach((data: ITestConfig) => {
      test(`Pod Server - IdP [${server.description}], test [${data.name}]`, async (t) => {
        if (data.performLogin) {
          await performLogin(server, testUserName);
        }

        const podRoot = server.podResourceServer.replace(
          "<TEST USER NAME>",
          testUserName
        );
        const resourceToGet = data.resourceToGet.replace("<POD ROOT>", podRoot);

        await t
          .selectText(FetchPage.fetchUriTextbox)
          .typeText(FetchPage.fetchUriTextbox, resourceToGet)
          .click(FetchPage.fetchButton)
          .wait(parseInt(testCafeWaitTime, 10));

        const responseBody = await FetchPage.fetchResponseTextbox.textContent;

        // To help debug failing tests, it can be really useful to display what
        // we actually got back from the server before we assert on it!
        console.log(`Got response body: ${responseBody}`);

        const expected = data.expectResponseContainsAnyOf.some((option) =>
          responseBody.includes(option)
        );

        await t.expect(expected).ok();
      });
    });
  }
});
