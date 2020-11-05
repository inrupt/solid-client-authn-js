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

// The following "empty" extensions ensure self-containment of the "browser" module
// documentation. Type annotations are available on the core interface at compile
// time, which ensures they are properly referenced in the documentation.
// Additionnally, users don't need to import anything from the "core" module.

import {
  ILoginInputOptions as ILoginInputOptionsCore,
  ISessionInfo as ISessionInfoCore,
  IStorage as IStorageCore,
} from "@inrupt/solid-client-authn-core";

export { Session, ISessionOptions } from "./Session";

export { SessionManager, ISessionManagerOptions } from "./SessionManager";
export { getClientAuthenticationWithDependencies } from "./dependencies";

// Re-export of types defined in the core module and produced/consumed by our API

export {
  NotImplementedError,
  ConfigurationError,
  InMemoryStorage,
} from "@inrupt/solid-client-authn-core";
export type ILoginInputOptions = ILoginInputOptionsCore;
export type ISessionInfo = ISessionInfoCore;
export type IStorage = IStorageCore;
