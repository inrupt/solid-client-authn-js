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

import { jest, it } from "@jest/globals";
import {
  fetch,
  getDefaultSession,
  handleIncomingRedirect,
  login,
  logout,
  onLogin,
  onLogout,
} from "../src/defaultSession";
import type * as SessionModuleType from "../src/Session";

jest.mock("../src/Session.ts");

it("does not instantiate a Session without calling one of its methods", () => {
  const mockedSession = jest.requireMock(
    "../src/Session.ts"
  ) as typeof SessionModuleType;

  expect(mockedSession.Session).not.toHaveBeenCalled();
});

it("re-uses the same Session when calling multiple methods", () => {
  const mockedSession = jest.requireMock(
    "../src/Session.ts"
  ) as typeof SessionModuleType;

  expect(mockedSession.Session).not.toHaveBeenCalled();

  onLogin(jest.fn());

  expect(mockedSession.Session).toHaveBeenCalledTimes(1);

  onLogout(jest.fn());

  expect(mockedSession.Session).toHaveBeenCalledTimes(1);
});

it("all functions pass on their arguments to the default session", () => {
  const defaultSession = getDefaultSession();
  const fetchSpy = jest.fn();
  defaultSession.fetch = fetchSpy as typeof defaultSession.fetch;
  const loginSpy = jest.fn();
  defaultSession.login = loginSpy as typeof defaultSession.login;
  const logoutSpy = jest.fn();
  defaultSession.logout = logoutSpy as typeof defaultSession.logout;
  const handleIncomingRedirectSpy = jest.fn();
  defaultSession.handleIncomingRedirect = handleIncomingRedirectSpy as typeof defaultSession.handleIncomingRedirect;
  const onLoginSpy = jest.spyOn(defaultSession, "onLogin");
  const onLogoutSpy = jest.spyOn(defaultSession, "onLogout");

  expect(fetchSpy).not.toHaveBeenCalled();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  fetch("https://example.com");
  expect(fetchSpy).toHaveBeenCalledTimes(1);

  expect(loginSpy).not.toHaveBeenCalled();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  login({});
  expect(loginSpy).toHaveBeenCalledTimes(1);

  expect(logoutSpy).not.toHaveBeenCalled();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  logout();
  expect(logoutSpy).toHaveBeenCalledTimes(1);

  expect(handleIncomingRedirectSpy).not.toHaveBeenCalled();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleIncomingRedirect("https://example.com");
  expect(handleIncomingRedirectSpy).toHaveBeenCalledTimes(1);

  expect(onLoginSpy).not.toHaveBeenCalled();
  onLogin(jest.fn());
  expect(onLoginSpy).toHaveBeenCalledTimes(1);

  expect(onLogoutSpy).not.toHaveBeenCalled();
  onLogout(jest.fn());
  expect(onLogoutSpy).toHaveBeenCalledTimes(1);
});
