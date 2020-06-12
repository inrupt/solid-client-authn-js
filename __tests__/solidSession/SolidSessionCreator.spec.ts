/**
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

/**
 * Test for SessionCreator
 */
import "reflect-metadata";
import {
  UuidGeneratorMock,
  UuidGeneratorMockResponse
} from "../../src/util/__mocks__/UuidGenerator";
import {
  AuthenticatedFetcherMock,
  AuthenticatedFetcherResponse
} from "../../src/authenticatedFetch/__mocks__/AuthenticatedFetcher";
import { LogoutHandlerMock } from "../../src/logout/__mocks__/LogoutHandler";
import { StorageUtilityMock } from "../../src/storage/__mocks__/StorageUtility";
import SessionCreator from "../../src/solidSession/SessionCreator";
import { ILoggedInSolidSession } from "../../src/solidSession/ISolidSession";

describe("SessionCreator", () => {
  const defaultMocks = {
    uuidGenerator: UuidGeneratorMock,
    authenticatedFetcher: AuthenticatedFetcherMock,
    logoutHandler: LogoutHandlerMock,
    storageUtility: StorageUtilityMock
  };
  function getSessionCreator(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): SessionCreator {
    const sessionCreator = new SessionCreator(
      mocks.uuidGenerator ?? defaultMocks.uuidGenerator,
      mocks.authenticatedFetcher ?? defaultMocks.authenticatedFetcher,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
    return sessionCreator;
  }

  describe("create", () => {
    it("creates a session with a given user", async () => {
      const sessionCreator = getSessionCreator();
      const session = sessionCreator.create({
        localUserId: "Commander Cool",
        loggedIn: true
      });
      expect(session).toMatchObject({
        localUserId: "Commander Cool",
        loggedIn: true
      });
    });

    it("creates a session without a given user", async () => {
      const sessionCreator = getSessionCreator();
      const session = sessionCreator.create({
        loggedIn: false
      });
      expect(session).toMatchObject({
        localUserId: UuidGeneratorMockResponse
      });
    });

    describe("create.logout", () => {
      it("triggers logout for a user", async () => {
        const sessionCreator = getSessionCreator();
        const session = sessionCreator.create({
          localUserId: "Commander Cool",
          loggedIn: true
        }) as ILoggedInSolidSession;
        await session.logout();
        expect(defaultMocks.logoutHandler.handle).toHaveBeenCalledWith(
          "Commander Cool"
        );
      });
    });

    describe("create.fetch", () => {
      it("triggers fetch for a user", async () => {
        const sessionCreator = getSessionCreator();
        const session = sessionCreator.create({
          localUserId: "Commander Cool",
          loggedIn: true
        }) as ILoggedInSolidSession;
        const response = await session.fetch("https://zoomies.com", {});
        expect(defaultMocks.authenticatedFetcher.handle).toHaveBeenCalledWith(
          { localUserId: "Commander Cool", type: "dpop" },
          "https://zoomies.com",
          {}
        );
        expect(response).toBe(AuthenticatedFetcherResponse);
      });
    });
  });

  describe("getSession", () => {
    it("creates a session from localstorage", async () => {
      const storageUtility = defaultMocks.storageUtility;
      storageUtility.getForUser.mockReturnValueOnce(
        Promise.resolve("https://zoomies.com/commanderCool#me")
      );
      const sessionCreator = getSessionCreator({ storageUtility });
      const session = await sessionCreator.getSession("commanderCool");
      expect(session).toMatchObject({
        localUserId: "commanderCool",
        webId: "https://zoomies.com/commanderCool#me"
      });
    });

    it("creates null if localstorage does not contain the user", async () => {
      const storageUtility = defaultMocks.storageUtility;
      storageUtility.getForUser.mockReturnValueOnce(Promise.resolve(null));
      const sessionCreator = getSessionCreator({ storageUtility });
      const session = await sessionCreator.getSession("commanderCool");
      expect(session).toBeNull();
    });
  });
});
