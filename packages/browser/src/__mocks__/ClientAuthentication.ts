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

import {
  IIssuerConfigFetcher,
  ILoginHandler,
  ILogoutHandler,
  IIncomingRedirectHandler,
  ISessionInfoManager,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import {
  mockStorageUtility,
  mockIncomingRedirectHandler,
} from "@inrupt/solid-client-authn-core/mocks";

import ClientAuthentication from "../ClientAuthentication";
import { IssuerConfigFetcherMock } from "../login/oidc/__mocks__/IssuerConfigFetcher";
import { mockLoginHandler } from "../login/__mocks__/LoginHandler";
import { mockLogoutHandler } from "../logout/__mocks__/LogoutHandler";
import { mockSessionInfoManager } from "../sessionInfo/__mocks__/SessionInfoManager";

type ClientAuthnDependencies = {
  storage: IStorageUtility;
  loginhandler: ILoginHandler;
  redirectHandler: IIncomingRedirectHandler;
  logoutHandler: ILogoutHandler;
  sessionInfoManager: ISessionInfoManager;
  issuerConfigFetcher: IIssuerConfigFetcher;
};

export const mockClientAuthentication = (
  mocks?: Partial<ClientAuthnDependencies>
): ClientAuthentication => {
  const storage = mocks?.storage ?? mockStorageUtility({});
  return new ClientAuthentication(
    mocks?.loginhandler ?? mockLoginHandler(),
    mocks?.redirectHandler ?? mockIncomingRedirectHandler(),
    mocks?.logoutHandler ?? mockLogoutHandler(storage),
    mocks?.sessionInfoManager ?? mockSessionInfoManager(storage),
    mocks?.issuerConfigFetcher ?? IssuerConfigFetcherMock
  );
};
