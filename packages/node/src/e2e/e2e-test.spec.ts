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

import { it, describe } from "@jest/globals";
import { config } from "dotenv-flow";
import { custom } from "openid-client";
import { Session } from "../Session";

custom.setHttpOptionsDefaults({
  timeout: 15000,
});

// Load environment variables from .env.local if available:
config({
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

type OidcIssuer = string;
type ClientId = string;
type ClientSecret = string;
type Pod = string;
type AuthDetails = [Pod, OidcIssuer, ClientId, ClientSecret];
// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // pod.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_ESS_POD!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_CLIENT_ID!,
    process.env.E2E_TEST_ESS_CLIENT_SECRET!,
  ],
  // dev-next.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_DEV_NEXT_POD!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_CLIENT_ID!,
    process.env.E2E_TEST_DEV_NEXT_CLIENT_SECRET!,
  ],
  // inrupt.net
  // Unfortunately we cannot authenticate against Node Solid Server yet, due to this issue:
  // https://github.com/solid/node-solid-server/issues/1533
  // Once that is fixed, credentials can be added here, and the other `describe()` can be removed.
];

describe.each(serversUnderTest)(
  "End-to-end authentication tests against Pod [%s] authenticated to [%s]",
  (rootContainerDisplayName, oidcIssuerDisplayName, clientId, clientSecret) => {
    const rootContainer = "https://" + rootContainerDisplayName;
    const oidcIssuer = "https://" + oidcIssuerDisplayName;

    // This first test just saves the trouble of looking for a library failure when
    // the environment wasn't properly set.
    describe("Environment", () => {
      it("contains the expected environment variables", () => {
        expect(rootContainer).not.toBeUndefined();
        expect(clientSecret).not.toBeUndefined();
        expect(oidcIssuer).not.toBeUndefined();
      });
    });

    describe("Authenticated fetch", () => {
      it("properly sets up session information", async () => {
        const session = new Session();
        await session.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });
        expect(session.info.isLoggedIn).toEqual(true);
        expect(session.info.sessionId).not.toBeUndefined();
        expect(session.info.webId).not.toBeUndefined();
        await session.logout();
      });

      it("can fetch a public resource when logged in", async () => {
        const session = new Session();
        await session.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const publicResourceUrl = session.info.webId!;
        const response = await session.fetch(publicResourceUrl);
        expect(response.status).toEqual(200);
        await expect(response.text()).resolves.toContain(
          ":PersonalProfileDocument"
        );
        await session.logout();
      });

      it("can fetch a private resource when logged in", async () => {
        const session = new Session();
        await session.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });
        const privateResourceUrl = rootContainer;
        console.log(`Fetching ${privateResourceUrl}`);
        const response = await session.fetch(privateResourceUrl);
        expect(response.status).toEqual(200);
        await expect(response.text()).resolves.toContain("ldp:BasicContainer");
        await session.logout();
      });

      it("can fetch a private resource when logged in after the same fetch failed", async () => {
        const session = new Session();
        const privateResourceUrl = rootContainer;
        let response = await session.fetch(privateResourceUrl);
        expect(response.status).toEqual(401);

        await session.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });

        response = await session.fetch(privateResourceUrl);
        expect(response.status).toEqual(200);

        await session.logout();
        response = await session.fetch(privateResourceUrl);
        expect(response.status).toEqual(401);
        await session.logout();
      });

      it("only logs in the requested session", async () => {
        const authenticatedSession = new Session();
        const privateResourceUrl = rootContainer;

        await authenticatedSession.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });

        let response = await authenticatedSession.fetch(privateResourceUrl);
        expect(response.status).toEqual(200);

        const nonAuthenticatedSession = new Session();
        response = await nonAuthenticatedSession.fetch(privateResourceUrl);
        expect(response.status).toEqual(401);
        await authenticatedSession.logout();
      });
    });

    describe("Unauthenticated fetch", () => {
      it("can fetch a public resource when not logged in", async () => {
        const authenticatedSession = new Session();
        await authenticatedSession.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const publicResourceUrl = authenticatedSession.info.webId!;

        const unauthenticatedSession = new Session();
        const response = await unauthenticatedSession.fetch(publicResourceUrl);
        expect(response.status).toEqual(200);
        await expect(response.text()).resolves.toContain(
          ":PersonalProfileDocument"
        );
        await authenticatedSession.logout();
      });

      it("cannot fetch a private resource when not logged in", async () => {
        const session = new Session();
        const privateResourceUrl = rootContainer;
        const response = await session.fetch(privateResourceUrl);
        expect(response.status).toEqual(401);
      });
    });

    describe("Post-logout fetch", () => {
      it("can fetch a public resource after logging out", async () => {
        const session = new Session();
        await session.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const publicResourceUrl = session.info.webId!;
        await session.logout();
        const response = await session.fetch(publicResourceUrl);
        expect(response.status).toEqual(200);
        await expect(response.text()).resolves.toContain(
          ":PersonalProfileDocument"
        );
      });

      it("cannot fetch a private resource after logging out", async () => {
        const session = new Session();
        const privateResourceUrl = rootContainer;
        await session.login({
          clientId,
          clientSecret,
          oidcIssuer,
        });
        await session.logout();
        const response = await session.fetch(privateResourceUrl);
        expect(response.status).toEqual(401);
      });
    });
  }
);
