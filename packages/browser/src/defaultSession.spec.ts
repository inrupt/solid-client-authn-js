//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { EVENTS } from "@inrupt/solid-client-authn-core";
import { jest, it, expect } from "@jest/globals";
import {
  fetch,
  getDefaultSession,
  handleIncomingRedirect,
  login,
  logout,
  onLogin,
  onSessionRestore,
  onLogout,
  events,
} from "./defaultSession";
import * as SessionModule from "./Session";

it("instantiates the default session lazily", () => {
  const singletonSession = new SessionModule.Session();
  const spiedConstructor = jest
    .spyOn(SessionModule, "Session")
    .mockImplementation(() => singletonSession);
  expect(spiedConstructor).not.toHaveBeenCalled();
  events().on(EVENTS.LOGIN, jest.fn());
  expect(spiedConstructor).toHaveBeenCalled();
});

it("re-uses the same Session when calling multiple methods", () => {
  const singletonSession = new SessionModule.Session();
  const spiedConstructor = jest
    .spyOn(SessionModule, "Session")
    .mockImplementation(() => singletonSession);

  events().on(EVENTS.LOGIN, jest.fn());

  expect(spiedConstructor).toHaveBeenCalledTimes(1);

  events().on(EVENTS.LOGOUT, jest.fn());

  // No new session has been instantiated.
  expect(spiedConstructor).toHaveBeenCalledTimes(1);
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
  defaultSession.handleIncomingRedirect =
    handleIncomingRedirectSpy as typeof defaultSession.handleIncomingRedirect;
  const onLoginSpy = jest.spyOn(defaultSession, "onLogin");
  const onLogoutSpy = jest.spyOn(defaultSession, "onLogout");
  const onSessionRestoreSpy = jest.spyOn(defaultSession, "onSessionRestore");
  const eventsOnSpy = jest.spyOn(defaultSession.events, "on");

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

  // onLogin will internall call events.on(...), so the following test
  // must come first.
  expect(eventsOnSpy).not.toHaveBeenCalled();
  events().on(EVENTS.LOGIN, jest.fn());
  expect(eventsOnSpy).toHaveBeenCalledTimes(1);

  expect(onLoginSpy).not.toHaveBeenCalled();
  onLogin(jest.fn());
  expect(onLoginSpy).toHaveBeenCalledTimes(1);

  expect(onSessionRestoreSpy).not.toHaveBeenCalled();
  onSessionRestore(jest.fn());
  expect(onSessionRestoreSpy).toHaveBeenCalledTimes(1);

  expect(onLogoutSpy).not.toHaveBeenCalled();
  onLogout(jest.fn());
  expect(onLogoutSpy).toHaveBeenCalledTimes(1);
});
