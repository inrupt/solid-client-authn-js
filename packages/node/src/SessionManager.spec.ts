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
import { SessionManager } from "./SessionManager";

const TEST_SESSION_ID = "test session id";

describe("SessionManager", () => {
  describe("constructor", () => {
    it("accepts an empty config", async () => {
      const mySessionManager = new SessionManager({});
      expect(mySessionManager).toBeDefined();
    });
  });

  describe("getSessions", () => {
    it("should work with no sessions", async () => {
      const mySessionManager = new SessionManager();
      await expect(mySessionManager.getSessions()).rejects.toThrow(
        "Not implemented"
      );
    });
  });

  describe("getSession", () => {
    it("should create sessions with unique generated session IDs", async () => {
      const mySessionManager = new SessionManager();
      const mySession1 = await mySessionManager.getSession();
      // Just assert that we have a non-empty session ID (ID could be anything).
      expect(mySession1.info.sessionId.length).toBeGreaterThan(0);

      const mySession2 = await mySessionManager.getSession();
      // Assert that session IDs are different (i.e. unique from one another).
      expect(mySession1.info.sessionId).not.toEqual(mySession2.info.sessionId);
    });

    it("should create session with specified session ID", async () => {
      const mySessionManager = new SessionManager();
      const mySession = await mySessionManager.getSession(TEST_SESSION_ID);
      expect(mySession.info.sessionId).toEqual(TEST_SESSION_ID);
    });

    it("should get existing new session", async () => {
      const mySessionManager = new SessionManager();
      const mySession = await mySessionManager.getSession(TEST_SESSION_ID);
      expect(mySession.info.sessionId).toEqual(TEST_SESSION_ID);

      const mySessionAgain = await mySessionManager.getSession(TEST_SESSION_ID);
      expect(mySessionAgain.info).toStrictEqual(mySession.info);
    });
  });

  describe("hasSession", () => {
    it("should have session only after it's created", async () => {
      const mySessionManager = new SessionManager();
      expect(await mySessionManager.hasSession(TEST_SESSION_ID)).toBeFalsy();

      await mySessionManager.getSession(TEST_SESSION_ID);
      await expect(mySessionManager.hasSession(TEST_SESSION_ID)).toBeTruthy();
    });
  });

  describe("detachSession", () => {
    it("should do nothing if session doesn't exist", async () => {
      const mySessionManager = new SessionManager();
      expect(() =>
        mySessionManager.detachSession(TEST_SESSION_ID)
      ).not.toThrow();
    });

    it("should detach session, but not logout or remove it", async () => {
      const mySessionManager = new SessionManager();
      await mySessionManager.getSession(TEST_SESSION_ID);
      await expect(mySessionManager.hasSession(TEST_SESSION_ID)).toBeTruthy();

      mySessionManager.detachSession(TEST_SESSION_ID);

      // Session is still actually there (detaching does not logout or remove
      // the underlying session).
      await expect(mySessionManager.hasSession(TEST_SESSION_ID)).toBeTruthy();
    });
  });
});
