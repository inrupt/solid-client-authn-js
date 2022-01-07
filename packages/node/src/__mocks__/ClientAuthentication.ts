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
  ILoginHandler,
  ILogoutHandler,
  IRedirectHandler,
  ISessionInfoManager,
  IStorageUtility,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import ClientAuthentication from "../ClientAuthentication";
import { RedirectHandlerMock } from "../login/oidc/redirectHandler/__mocks__/RedirectHandler";
import { LoginHandlerMock } from "../login/__mocks__/LoginHandler";
import {
  LogoutHandlerMock,
  mockLogoutHandler,
} from "../logout/__mocks__/LogoutHandler";
import {
  mockSessionInfoManager,
  SessionInfoManagerMock,
} from "../sessionInfo/__mocks__/SessionInfoManager";

export const mockClientAuthentication = (): ClientAuthentication =>
  new ClientAuthentication(
    LoginHandlerMock,
    RedirectHandlerMock,
    LogoutHandlerMock,
    SessionInfoManagerMock
  );

type CustomMocks = {
  storage: IStorageUtility;
  sessionInfoManager: ISessionInfoManager;
  loginHandler: ILoginHandler;
  redirectHandler: IRedirectHandler;
  logoutHandler: ILogoutHandler;
};

export const mockCustomClientAuthentication = (
  mocks: Partial<CustomMocks>
): ClientAuthentication => {
  const storage = mocks.storage ?? mockStorageUtility({});
  return new ClientAuthentication(
    mocks.loginHandler ?? LoginHandlerMock,
    mocks.redirectHandler ?? RedirectHandlerMock,
    mocks.logoutHandler ?? mockLogoutHandler(storage),
    mocks.sessionInfoManager ?? mockSessionInfoManager(storage)
  );
};
