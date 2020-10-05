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

export { default as ILoginInputOptions } from "./ILoginInputOptions";

export { default as ILoginHandler } from "./login/ILoginHandler";
export { default as ILoginOptions } from "./login/ILoginOptions";

export { default as ILogoutHandler } from "./logout/ILogoutHandler";

export { default as IHandleable } from "./util/handlerPattern/IHandleable";

export { default as IAuthenticatedFetcher } from "./authenticatedFetch/IAuthenticatedFetcher";
export { default as IRequestCredentials } from "./authenticatedFetch/IRequestCredentials";

export { default as IDpopRequestCredentials } from "./dpop/IDpopRequestCredentials";

export { default as IOidcHandler } from "./login/oidc/IOidcHandler";
export { default as IOidcOptions } from "./login/oidc/IOidcOptions";

export { default as IRedirectHandler } from "./login/oidc/redirectHandler/IRedirectHandler";
export { IRedirector, IRedirectorOptions } from "./login/oidc/IRedirector";

export { default as ISessionInfo } from "./sessionInfo/ISessionInfo";
export {
  ISessionInfoManager,
  ISessionInfoManagerOptions,
} from "./sessionInfo/ISessionInfoManager";

export { default as IIssuerConfigFetcher } from "./login/oidc/IIssuerConfigFetcher";
export { default as issuerConfigSchema } from "./login/oidc/issuerConfigSchema";

// Storage.
export { default as IStorage } from "./storage/IStorage";

// Utility functions.
export { default as validateSchema } from "./util/validateSchema";

export { default as IStorageUtility } from "./storage/IStorageUtility";
export { default as StorageUtility } from "./storage/StorageUtility";

// Mocks.
export {
  mockStorageUtility,
  StorageUtilityMock,
  StorageUtilityGetResponse,
  StorageUtilitySafeGetResponse,
} from "./storage/__mocks__/StorageUtility";
