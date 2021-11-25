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
import type { Session } from "../../Session";
import { WindowToWorkerHandler } from "./WindowToWorkerHandler";

describe("WindowToWorkerHandler", () => {
  let windowSelf: Window;
  let worker: Worker;
  let session: Session;
  let handler: WindowToWorkerHandler;
  beforeEach(() => {
    windowSelf = <any>{};
    worker = <any>{
      postMessage: jest.fn(),
    };
    session = <any>{
      authenticateHeaders: jest.fn(
        async (
          resource: string,
          method: string,
          headersUnauthenticated: Headers
        ) => {
          const authHeaders = new Headers(headersUnauthenticated);
          authHeaders.set("Authenticated", "true");
          return authHeaders;
        }
      ),
    };
    handler = new WindowToWorkerHandler(windowSelf, worker, session);
  });

  describe("onmessage", () => {
    it("should ignore unknown literal messages", () => {
      expect(
        handler.onmessage(<any>{
          data: "dummy",
        })
      ).toBe(false);

      expect(session.authenticateHeaders).not.toHaveBeenCalled();
      expect(worker.postMessage).not.toHaveBeenCalled();
    });

    it("should ignore unknown object messages", () => {
      expect(
        handler.onmessage(<any>{
          data: { a: "dummy" },
        })
      ).toBe(false);

      expect(session.authenticateHeaders).not.toHaveBeenCalled();
      expect(worker.postMessage).not.toHaveBeenCalled();
    });

    it("should handle valid auth messages", async () => {
      expect(
        handler.onmessage(<any>{
          data: {
            [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
              messageId: 10,
              resource: "URL",
              method: "GET",
              headersUnauthenticatedRaw: [["Accept", "text/turtle"]],
            },
          },
        })
      ).toBe(true);

      // Wait a tick for the job to resolve
      await new Promise(setImmediate);

      expect(session.authenticateHeaders).toHaveBeenCalledWith(
        "URL",
        "GET",
        new Headers({
          Accept: "text/turtle",
        })
      );
      expect(worker.postMessage).toHaveBeenCalledWith({
        [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
          messageId: 10,
          headersAuthenticatedRaw: [
            ["accept", "text/turtle"],
            ["authenticated", "true"],
          ],
        },
      });
    });

    it("should handle valid auth messages that produce an error", async () => {
      session.authenticateHeaders = jest.fn(() =>
        Promise.reject(new Error("Auth headers rejection"))
      );
      expect(
        handler.onmessage(<any>{
          data: {
            [WorkerToWindowHandler.MESSAGE_KEY_POST]: {
              messageId: 10,
              resource: "URL",
              method: "GET",
              headersUnauthenticatedRaw: [["Accept", "text/turtle"]],
            },
          },
        })
      ).toBe(true);

      // Wait a tick for the job to resolve
      await new Promise(setImmediate);

      expect(session.authenticateHeaders).toHaveBeenCalledWith(
        "URL",
        "GET",
        new Headers({
          Accept: "text/turtle",
        })
      );
      expect(worker.postMessage).toHaveBeenCalledWith({
        [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: {
          messageId: 10,
          errorMessage: "Auth headers rejection",
        },
      });
    });
  });
});
