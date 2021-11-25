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

import { Session } from "../..";
import {
  WorkerToWindowHandler,
  IWorkerMessagePost,
  IWorkerMessageResponse,
} from "./WorkerToWindowHandler";

/**
 * Handler that is to be instantiated within the main WINDOW for allowing a worker to request authenticated headers.
 * Must be used together with {@link WorkerToWindowHandler}.
 *
 * After instantiation, users MUST invoke @link{onmessage} within the @link{worker.onmessage} callback.
 *
 * For example:
 * ```
   const session = getDefaultSession();
   const worker = new Worker(...);
   const windowToWorkerHandler = new WindowToWorkerHandler(this, worker, session);

   worker.onmessage = async (message) => {
      if (windowToWorkerHandler.onmessage(message)) {
        // This means that the message was taken care of by the handler
      } else {
        // Optionally, take care of any other custom messages that your worker may send.
      }
    };
   ```
 */
export class WindowToWorkerHandler {
  public constructor(
    private windowSelf: Window,
    private worker: Worker,
    private session: Session
  ) {}

  /**
   * Handle messages from the worker to the window.
   * @param messageEvent A message.
   * @return True if the message was meant for this handler, false otherwise.
   */
  public onmessage(messageEvent: MessageEvent): boolean {
    if (
      typeof messageEvent.data === "object" &&
      WorkerToWindowHandler.MESSAGE_KEY_POST in messageEvent.data
    ) {
      // Authenticate headers from incoming message
      const message: IWorkerMessagePost =
        messageEvent.data[WorkerToWindowHandler.MESSAGE_KEY_POST];
      this.session
        .authenticateHeaders(
          message.resource,
          message.method,
          new Headers(message.headersUnauthenticatedRaw)
        )
        .then((headersAuthenticated) => {
          // Send response with authenticated headers
          const messageResponse: IWorkerMessageResponse = {
            messageId: message.messageId,
            // TODO: this any cast can be removed when updating to TS 4.1
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            headersAuthenticatedRaw: [...(<any>headersAuthenticated).entries()],
          };
          this.worker.postMessage({
            [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: messageResponse,
          });
        })
        .catch((error) => {
          // Send response with error reply if something goes wrong
          const messageResponse: IWorkerMessageResponse = {
            messageId: message.messageId,
            errorMessage: error.message,
          };
          this.worker.postMessage({
            [WorkerToWindowHandler.MESSAGE_KEY_RESPONSE]: messageResponse,
          });
        });

      return true;
    }
    return false;
  }
}
