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

import { Session } from "./Session";

let defaultSession: Session;

/**
 * Obtain the {@link Session} used when not explicitly instantiating one yourself.
 *
 * When using the top-level exports {@link fetch}, {@link login}, {@link logout},
 * {@link handleIncomingRedirect}, {@link onLogin} and {@link onLogout}, these apply to an
 * implicitly-instantiated {@link Session}.
 * This function returns a reference to that Session in order to obtain e.g. the current user's
 * WebID.
 */
export function getDefaultSession(): Session {
  if (typeof defaultSession === "undefined") {
    defaultSession = new Session();
  }
  return defaultSession;
}

/**
 * This function's signature is equal to `window.fetch`, but if the current user is authenticated
 * (see [[login]] and [[handleIncomingRedirect]), requests made using it will include that user's
 * credentials. If not, this will behave just like the regular `window.fetch`.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch}
 */
export const fetch: Session["fetch"] = (...args) => {
  const session = getDefaultSession();
  return session.fetch(...args);
};

/**
 * Triggers the login process. Note that this method will redirect the user away from your app.
 *
 * @param options Parameter to customize the login behaviour. In particular, two options are mandatory: `options.oidcIssuer`, the user's identity provider, and `options.redirectUrl`, the URL to which the user will be redirected after logging in their identity provider.
 * @returns This method should redirect the user away from the app: it does not return anything. The login process is completed by [[handleIncomingRedirect]].
 */
export const login: Session["login"] = (...args) => {
  const session = getDefaultSession();
  return session.login(...args);
};
/**
 * Logs the user out of the application. This does not log the user out of their Solid identity provider, and should not redirect the user away.
 */
export const logout: Session["logout"] = (...args) => {
  const session = getDefaultSession();
  return session.logout(...args);
};

/**
 * Completes the login process by processing the information provided by the Solid identity provider through redirect.
 *
 * @param url The URL of the page handling the redirect, including the query parameters — these contain the information to process the login.
 */
export const handleIncomingRedirect: Session["handleIncomingRedirect"] = (
  ...args
) => {
  const session = getDefaultSession();
  return session.handleIncomingRedirect(...args);
};

/**
 * Register a callback function to be called when a user completes login.
 *
 * The callback is called when {@link handleIncomingRedirect} completes successfully.
 *
 * @param callback The function called when a user completes login.
 */
export const onLogin: Session["onLogin"] = (...args) => {
  const session = getDefaultSession();
  return session.onLogin(...args);
};

/**
 * Register a callback function to be called when a user logs out:
 *
 * @param callback The function called when a user completes logout.
 */
export const onLogout: Session["onLogout"] = (...args) => {
  const session = getDefaultSession();
  return session.onLogout(...args);
};
