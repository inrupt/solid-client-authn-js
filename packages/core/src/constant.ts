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

/**
 * Intended to be used by dependent packages as a common prefix for keys into
 * storage mechanisms (so as to group all keys related to Solid Client Authn
 * within those storage mechanisms, e.g., window.localStorage).
 */
export const SOLID_CLIENT_AUTHN_KEY_PREFIX = "solidClientAuthn:";

/**
 * Ordered list of signature algorithms, from most preferred to least preferred.
 */
export const PREFERRED_SIGNING_ALG = ["ES256", "RS256"];

export const EVENTS = {
  // Note that an `error` events MUST be listened to: https://nodejs.org/dist/latest-v16.x/docs/api/events.html#error-events.
  ERROR: "error",
  LOGIN: "login",
  LOGOUT: "logout",
  NEW_REFRESH_TOKEN: "newRefreshToken",
  SESSION_EXPIRED: "sessionExpired",
  SESSION_EXTENDED: "sessionExtended",
  SESSION_RESTORED: "sessionRestore",
  TIMEOUT_SET: "timeoutSet",
};
/**
 * We want to refresh a token 5 seconds before it expires.
 */
export const REFRESH_BEFORE_EXPIRATION_SECONDS = 5;

// The openid scope requests an OIDC ID token token to be returned.
const SCOPE_OPENID = "openid";
// The offline_access scope requests a refresh token to be returned.
const SCOPE_OFFLINE = "offline_access";
// The webid scope is required as per https://solid.github.io/solid-oidc/#webid-scope
const SCOPE_WEBID = "webid";
// The scopes are expected as a space-separated list.
export const DEFAULT_SCOPES = [SCOPE_OPENID, SCOPE_OFFLINE, SCOPE_WEBID].join(
  " "
);
