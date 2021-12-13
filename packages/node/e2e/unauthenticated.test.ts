/*
 * Copyright 2021 Inrupt Inc.
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

import { join } from "path";
import { test, strictSame } from "tap";

import { config } from "dotenv-flow";
import { custom } from "openid-client";
import { Session } from "../src/Session";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

// Load environment variables from .env.local if available:
config({
  path: join(__dirname, "..", "..", "e2e"),
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

type AuthDetails = {
  pod: string;
  oidcIssuer: string;
  clientId: string;
  clientSecret: string;
};
// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // pod.inrupt.com:
  {
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    pod: process.env.E2E_TEST_ESS_POD!.replace(/^https:\/\//, ""),
    oidcIssuer: process.env.E2E_TEST_ESS_IDP_URL!.replace(/^https:\/\//, ""),
    clientId: process.env.E2E_TEST_ESS_CLIENT_ID!,
    clientSecret: process.env.E2E_TEST_ESS_CLIENT_SECRET!,
  },
  // dev-next.inrupt.com:
  {
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    pod: process.env.E2E_TEST_DEV_NEXT_POD!.replace(/^https:\/\//, ""),
    oidcIssuer: process.env.E2E_TEST_DEV_NEXT_IDP_URL!.replace(
      /^https:\/\//,
      ""
    ),
    clientId: process.env.E2E_TEST_DEV_NEXT_CLIENT_ID!,
    clientSecret: process.env.E2E_TEST_DEV_NEXT_CLIENT_SECRET!,
  },
  // inrupt.net
  // Unfortunately we cannot authenticate against Node Solid Server yet, due to this issue:
  // https://github.com/solid/node-solid-server/issues/1533
  // Once that is fixed, credentials can be added here, and the other `describe()` can be removed.
];

serversUnderTest.forEach((envValues) => {
  const { oidcIssuer: oidcIssuerDisplay, pod: podDisplay } = envValues;
  console.log(
    `Running tests for ${podDisplay}, authenticated to ${oidcIssuerDisplay}`
  );
  const podRoot = `https://${podDisplay}`;

  test("fetch a public resource when not logged in", async () => {
    const session = new Session();
    // Note that demo pods should have a public container at the /public path.
    const response = await session.fetch(`${podRoot}public/`);
    strictSame(
      response.status,
      200,
      "Unauthenticated requests to public resources should succeed."
    );
  });

  test("fetch a private resource when not logged in", async () => {
    const session = new Session();
    const response = await session.fetch(podRoot);
    strictSame(
      response.status,
      401,
      "Unauthenticated requests to private resources should fail with 401."
    );
  });
});
