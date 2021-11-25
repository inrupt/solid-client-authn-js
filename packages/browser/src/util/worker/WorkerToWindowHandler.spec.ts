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

import { jest } from "@jest/globals";
import { WorkerToWindowHandler } from "./WorkerToWindowHandler";

describe("WorkerToWindowHandler", () => {
  let workerSelf: Window;
  let handler: WorkerToWindowHandler;
  beforeEach(() => {
    workerSelf = <any>{
      postMessage: jest.fn(),
    };
    handler = new WorkerToWindowHandler(workerSelf);
    global.fetch = <any>jest.fn(() => "response");
  });

  describe("buildAuthenticatedFetch", () => {
    it("should return a function", () => {
      expect(handler.buildAuthenticatedFetch()).toBeInstanceOf(Function);
    });

    describe("a built auth fetch", () => {
      let authFetch: any;
      beforeEach(() => {
        authFetch = handler.buildAuthenticatedFetch();
      });

      it("should communicate to resolve the request without headers", async () => {
        const fetchPromise = authFetch("URL");

        // Expect message from worker to window
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 0,
            resource: "URL",
            method: "get",
            headersUnauthenticatedRaw: [],
          },
        });

        // Send message from window to worker
        expect(
          handler.onmessage(<any>{
            data: {
              [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
                messageId: 0,
                headersAuthenticatedRaw: [["authenticated", "true"]],
              },
            },
          })
        ).toBe(true);

        // The fetch promise should now be able to resolve
        await expect(fetchPromise).resolves.toBe("response");

        // Expect request to be done using authenticated headers
        expect(global.fetch).toHaveBeenCalledWith("URL", {
          headers: new Headers({
            authenticated: "true",
          }),
        });
      });

      it("should communicate to resolve the request with headers", async () => {
        const fetchPromise = authFetch("URL", {
          headers: new Headers({
            A: "B",
          }),
        });

        // Expect message from worker to window
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 0,
            resource: "URL",
            method: "get",
            headersUnauthenticatedRaw: [["a", "B"]],
          },
        });

        // Send message from window to worker
        expect(
          handler.onmessage(<any>{
            data: {
              [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
                messageId: 0,
                headersAuthenticatedRaw: [
                  ["a", "B"],
                  ["authenticated", "true"],
                ],
              },
            },
          })
        ).toBe(true);

        // The fetch promise should now be able to resolve
        await expect(fetchPromise).resolves.toBe("response");

        // Expect request to be done using authenticated headers
        expect(global.fetch).toHaveBeenCalledWith("URL", {
          headers: new Headers({
            a: "B",
            authenticated: "true",
          }),
        });
      });

      it("should communicate to resolve the request with headers in init object", async () => {
        const fetchPromise = authFetch({
          url: "URL",
          headers: new Headers({
            A: "B",
          }),
        });

        // Expect message from worker to window
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 0,
            resource: "URL",
            method: "get",
            headersUnauthenticatedRaw: [["a", "B"]],
          },
        });

        // Send message from window to worker
        expect(
          handler.onmessage(<any>{
            data: {
              [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
                messageId: 0,
                headersAuthenticatedRaw: [
                  ["a", "B"],
                  ["authenticated", "true"],
                ],
              },
            },
          })
        ).toBe(true);

        // The fetch promise should now be able to resolve
        await expect(fetchPromise).resolves.toBe("response");

        // Expect request to be done using authenticated headers
        expect(global.fetch).toHaveBeenCalledWith(
          {
            url: "URL",
            headers: new Headers({
              a: "B",
              authenticated: "true",
            }),
          },
          {}
        );
      });

      it("should communicate to resolve an erroring request", async () => {
        const fetchPromise = authFetch("URL", {
          headers: new Headers({
            A: "B",
          }),
        });

        // Expect message from worker to window
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 0,
            resource: "URL",
            method: "get",
            headersUnauthenticatedRaw: [["a", "B"]],
          },
        });

        // Send message from window to worker
        expect(
          handler.onmessage(<any>{
            data: {
              [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
                messageId: 0,
                errorMessage: "Auth request failed",
              },
            },
          })
        ).toBe(true);

        // The fetch promise should now be able to resolve
        await expect(fetchPromise).rejects.toThrow("Auth request failed");

        // Expect request not to be done
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it("should increment message id for every request", async () => {
        authFetch("URL1");
        authFetch("URL2");
        authFetch("URL3");

        // Expect message from worker to window
        expect(workerSelf.postMessage).toHaveBeenCalledTimes(3);
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 0,
            resource: "URL1",
            method: "get",
            headersUnauthenticatedRaw: [],
          },
        });
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 1,
            resource: "URL2",
            method: "get",
            headersUnauthenticatedRaw: [],
          },
        });
        expect(workerSelf.postMessage).toHaveBeenCalledWith({
          [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
            messageId: 2,
            resource: "URL3",
            method: "get",
            headersUnauthenticatedRaw: [],
          },
        });
      });
    });
  });

  describe("onmessage", () => {
    it("should ignore unknown literal messages", () => {
      expect(
        handler.onmessage(<any>{
          data: "dummy",
        })
      ).toBe(false);
    });

    it("should ignore unknown object messages", () => {
      expect(
        handler.onmessage(<any>{
          data: { a: "dummy" },
        })
      ).toBe(false);
    });

    it("should throw when a message id is not expected", () => {
      expect(() =>
        handler.onmessage(<any>{
          data: {
            [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
              messageId: 0,
            },
          },
        })
      ).toThrow(`Received unexpected authenticated headers response for id 0`);
    });
  });
});
