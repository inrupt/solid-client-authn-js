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

import test from "ava";
import { join } from "path";
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
  const {
    clientId,
    clientSecret,
    oidcIssuer: oidcIssuerDisplay,
    pod: podDisplay,
  } = envValues;
  const oidcIssuer = `https://${oidcIssuerDisplay}`;
  const podRoot = `https://${podDisplay}`;

  const session = new Session();
  test.beforeEach(async () => {
    await session.login({
      clientId,
      clientSecret,
      oidcIssuer,
    });
  });

  test.afterEach(async () => {
    await session.logout();
  });

  // Note: The tests names must differ from one run of the loop to the other.
  // This will no longer be a problem after refactoring so that the environment
  // is set by the test matrix.
  test(`properly sets up session information (Pod: ${podDisplay}, issuer: ${oidcIssuerDisplay})`, async (t) => {
    t.is(
      session.info.isLoggedIn,
      true,
      "session.info.isLoggedIn should be true."
    );
    t.not(session.info.sessionId, undefined),
      "session.info.sessionId should be defined.";
    t.not(
      session.info.webId,
      undefined,
      "session.info.webid should be defined"
    );
  });

  test(`fetch a public resource when logged in (Pod: ${podDisplay}, issuer: ${oidcIssuerDisplay})`, async (t) => {
    const publicResourceUrl = session.info.webId as string;
    const response = await session.fetch(publicResourceUrl, {
      headers: {
        Accept: "text/turtle",
      },
    });
    t.is(response.status, 200);
    t.assert((await response.text()).includes("PersonalProfileDocument"));
  });

  test(`fetch a private resource when logged in (Pod: ${podDisplay}, issuer: ${oidcIssuerDisplay})`, async (t) => {
    const response = await session.fetch(podRoot);
    t.is(response.status, 200);
    t.assert((await response.text()).includes("BasicContainer"));
  });

  test(`fetch a private resource when logged in after the same fetch failed (Pod: ${podDisplay}, issuer: ${oidcIssuerDisplay})`, async (t) => {
    // Note that this is a session different to the one logged in in the `beforeEach` hook.
    const session = new Session();
    let response = await session.fetch(podRoot);
    t.is(response.status, 401, "An unauthenticated request should fail.");

    await session.login({
      clientId,
      clientSecret,
      oidcIssuer,
    });

    response = await session.fetch(podRoot);
    t.is(response.status, 200, "The now authenticated request suould succeed.");

    await session.logout();
  });

  test(`only logs in the requested session (Pod: ${podDisplay}, issuer: ${oidcIssuerDisplay})`, async (t) => {
    // A shared session is logged in in the test setup. This intends to
    // check that no side-effects accidentally log other sessions in.
    const nonAuthenticatedSession = new Session();
    const response = await nonAuthenticatedSession.fetch(podRoot);
    t.is(response.status, 401);
  });
});
