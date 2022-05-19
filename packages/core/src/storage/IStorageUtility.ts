/*
 * Copyright 2022 Inrupt Inc.
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

import { IClient } from "../login/oidc/IClient";

/**
 * @hidden
 * @packageDocumentation
 */

export default interface IStorageUtility {
  get(
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined>;
  set(
    key: string,
    value: string | number,
    options?: { secure?: boolean }
  ): Promise<void>;
  delete(key: string, options?: { secure?: boolean }): Promise<void>;

  // For managing information about the client:
  getClientDetails(issuer: string): Promise<IClient | null>;
  setClientDetails(issuer: string, details: IClient): Promise<void>;
  deleteClientDetails(issuer: string): Promise<void>;

  // For managing information about the users' session:
  getForUser(
    userId: string,
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | number | undefined>;
  setForUser(
    userId: string,
    values: Record<string, string | number | undefined>,
    options?: { secure?: boolean }
  ): Promise<void>;
  deleteForUser(
    userId: string,
    key: string,
    options?: { secure?: boolean }
  ): Promise<void>;
  deleteAllUserData(
    userId: string,
    options?: { secure?: boolean }
  ): Promise<void>;
}
