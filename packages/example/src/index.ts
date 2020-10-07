/*
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

import {
  ILoginInputOptions,
  ISessionInfo,
  IStorage,
} from "@inrupt/solid-client-authn-browser";

/**
 * Simple implementation of our exported types.
 */
export class MyExportTestingClass
  implements ILoginInputOptions, ISessionInfo, IStorage {
  // From: ILoginInputOptions.
  public readonly clientName: string;

  // From: ISessionInfo.
  public readonly isLoggedIn: boolean;
  public readonly sessionId: string;

  constructor() {
    this.clientName = "Some client application name";

    this.isLoggedIn = true;
    this.sessionId = "Required Session ID";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(key: string): Promise<string | undefined> {
    return Promise.resolve("no problem!");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async set(key: string, value: string): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(key: string): Promise<void> {
    return Promise.resolve();
  }
}

const testImpl = new MyExportTestingClass();

console.log(`Client name: [${testImpl.clientName}]`);
console.log(`Is logged in: [${testImpl.isLoggedIn}]`);
console.log(`Session ID [${testImpl.sessionId}]`);
testImpl
  .get("whatever")
  .then((response) => console.log(`Storage value: [${response}]`));
