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
import { StorageUtilityMock } from "../../src/localStorage/__mocks__/StorageUtility";
import SessionCreator from "../../src/solidSession/SessionCreator";

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
        });
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
        });
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
