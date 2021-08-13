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

export * from "./constant";

export { default as ILoginInputOptions } from "./ILoginInputOptions";

export { default as ILoginHandler, LoginResult } from "./login/ILoginHandler";
export { default as ILoginOptions } from "./login/ILoginOptions";

export { default as ILogoutHandler } from "./logout/ILogoutHandler";

export { default as IHandleable } from "./util/handlerPattern/IHandleable";
export { default as AggregateHandler } from "./util/handlerPattern/AggregateHandler";

export { default as IOidcHandler } from "./login/oidc/IOidcHandler";
export { default as IOidcOptions } from "./login/oidc/IOidcOptions";

export {
  default as IRedirectHandler,
  RedirectInput,
  RedirectResult,
  getWebidFromTokenPayload,
  fetchJwks,
} from "./login/oidc/redirectHandler/IRedirectHandler";
export { IRedirector, IRedirectorOptions } from "./login/oidc/IRedirector";

export {
  ISessionInfo,
  ISessionInternalInfo,
  isSupportedTokenType,
} from "./sessionInfo/ISessionInfo";
export {
  ISessionInfoManager,
  ISessionInfoManagerOptions,
  USER_SESSION_PREFIX,
} from "./sessionInfo/ISessionInfoManager";

export { IIssuerConfigFetcher } from "./login/oidc/IIssuerConfigFetcher";
export { IIssuerConfig } from "./login/oidc/IIssuerConfig";
export {
  IClientRegistrar,
  IClientRegistrarOptions,
  handleRegistration,
  determineSigningAlg,
} from "./login/oidc/IClientRegistrar";
export { IClient } from "./login/oidc/IClient";

// Storage.
export { default as IStorage } from "./storage/IStorage";

// Utility functions.
export { default as IStorageUtility } from "./storage/IStorageUtility";
export {
  default as StorageUtility,
  OidcContext,
  loadOidcContextFromStorage,
  saveSessionInfoToStorage,
  getSessionIdFromOauthState,
  ResourceServerSession,
} from "./storage/StorageUtility";
export { default as InMemoryStorage } from "./storage/InMemoryStorage";

export { default as ConfigurationError } from "./errors/ConfigurationError";
export { default as NotImplementedError } from "./errors/NotImplementedError";
export { InvalidResponseError } from "./errors/InvalidResponseError";
export { OidcProviderError } from "./errors/OidcProviderError";

export {
  createDpopHeader,
  KeyPair,
  generateDpopKeyPair,
} from "./authenticatedFetch/dpopUtils";

export {
  buildAuthenticatedFetch,
  DpopHeaderPayload,
  RefreshOptions,
} from "./authenticatedFetch/fetchFactory";

export {
  ITokenRefresher,
  TokenEndpointResponse,
} from "./login/oidc/refresh/ITokenRefresher";

// Mocks.
export {
  mockStorage,
  mockStorageUtility,
  StorageUtilityMock,
  StorageUtilityGetResponse,
} from "./storage/__mocks__/StorageUtility";
