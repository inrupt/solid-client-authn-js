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

/**
 * Handler that is to be instantiated within a WORKER for allowing it to request authenticated headers from the main window.
 * Must be used together with {@link WindowToWorkerHandler}.
 *
 * After instantiation, users MUST invoke @link{onmessage} within the @link{self.onmessage} callback.
 * Once that is done, the @{link buildAuthenticatedFetch()} method may be used to create new authenticated fetch functions.
 *
 * For example:
 * ```
   const workerToWindowHandler = new WorkerToWindowHandler(self);
   self.onmessage = (message => {
    if (workerToWindowHandler.onmessage(message)) {
      // This means that the message was taken care of by the handler
    } else {
      // Optionally, take care of any other custom messages that your worker may receive.
    }
   ```
 */
export class WorkerToWindowHandler {
  public static readonly MESSAGE_KEY_POST =
    "solid-client-authn-js.requestUnauthenticated";

  public static readonly MESSAGE_KEY_RESPONSE =
    "solid-client-authn-js.headersAuthenticated";

  private messageCounter = 0;

  private messageReceiveCallbackBuffer: Record<
    number,
    {
      resolve: (headersAuthenticated: Headers) => void;
      reject: (error: Error) => void;
    }
  > = {};

  public constructor(private workerSelf: Window) {}

  /**
   * Handle messages from the window to the worker.
   * @param messageEvent A message.
   * @return True if the message was meant for this handler, false otherwise.
   */
  public onmessage(messageEvent: MessageEvent): boolean {
    if (WorkerToWindowHandler.MESSAGE_KEY_RESPONSE in messageEvent.data) {
      // Read message
      const message: IWorkerMessageResponse =
        messageEvent.data[WorkerToWindowHandler.MESSAGE_KEY_RESPONSE];

      // Check if we were expecting this message
      const callback = this.messageReceiveCallbackBuffer[message.messageId];
      if (!callback) {
        throw new Error(
          `Received unexpected authenticated headers response for id ${message.messageId}`
        );
      }

      // Resolve the callback
      if (message.errorMessage) {
        callback.reject(new Error(message.errorMessage));
      } else {
        callback.resolve(new Headers(message.headersAuthenticatedRaw));
      }

      // Cleanup buffer
      delete this.messageReceiveCallbackBuffer[message.messageId];

      return true;
    }
    return false;
  }

  /**
   * Return a new fetch function that can perform authenticated requests.
   *
   * All requests will be preceded with a single message round-trip with the main
   * window to authenticate the headers of this request. But the actual fetch
   * request will occur from within this worker.
   */
  public buildAuthenticatedFetch(): typeof global.fetch {
    // Wrapper over global.fetch, but authenticate headers
    return async (
      input: RequestInfo,
      init?: RequestInit
    ): Promise<Response> => {
      const inputRaw = typeof input === "string";
      const headersAuthenticated = await this.authenticateHeaders(
        inputRaw ? input : input.url,
        (inputRaw ? init?.method : input.method) || "get",
        new Headers(inputRaw || !input.headers ? init?.headers : input.headers)
      );
      return global.fetch(input, { ...init, headers: headersAuthenticated });
    };
  }

  protected authenticateHeaders(
    resource: string,
    method: string,
    headers: Headers
  ): Promise<Headers> {
    // Prepare new message in the callback buffer, so that it will be handled during onmessage
    const messageId = this.messageCounter;
    const promise = new Promise<Headers>((resolve, reject) => {
      this.messageReceiveCallbackBuffer[messageId] = { resolve, reject };
    });
    this.messageCounter += 1;

    // Send a message to the main window
    const message: IWorkerMessagePost = {
      messageId,
      resource,
      method,
      // TODO: this any cast can be removed when updating to TS 4.1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headersUnauthenticatedRaw: [...(<any>headers).entries()],
    };
    this.workerSelf.postMessage({
      [WorkerToWindowHandler.MESSAGE_KEY_POST]: message,
    });
    return promise;
  }
}

/**
 * A message that will be sent from worker to window.
 */
export interface IWorkerMessagePost {
  messageId: number;
  resource: string;
  method: string;
  headersUnauthenticatedRaw: string[][];
}

/**
 * A message that will be sent from window to worker.
 */
export interface IWorkerMessageResponse {
  messageId: number;
  headersAuthenticatedRaw?: string[][];
  errorMessage?: string;
}
