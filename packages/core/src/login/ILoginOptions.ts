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

/**
 * @hidden
 * @packageDocumentation
 */

import ILoginInputOptions from "../ILoginInputOptions";
import { EventEmitter } from "events";

/**
 * We extend our public login option interface to add data and/or constraints
 * necessary for our internal use.
 *
 * @hidden
 */
export default interface ILoginOptions extends ILoginInputOptions {
  // This session ID is mandatory for internal use, so we could consider making
  // it an explicit parameter on our login handler interface (rather than
  // 'bundling' into this options interface), but it wouldn't be a significant
  // improvement really...
  sessionId: string;
  /**
   * Specify whether the Solid Identity Provider may, or may not, interact with the user (for example,
   * the normal login process **_requires_** human interaction for them to enter their credentials,
   * but if a user simply refreshes the current page in their browser, we'll want to log them in again
   * automatically, i.e., without prompting them to manually provide their credentials again).
   */
  prompt?: string;
  // Force the token type to be required (i.e. no longer optional).
  tokenType: "DPoP" | "Bearer";

  /**
   * Event emitter enabling calling user-specified callbacks.
   */
  eventEmitter: EventEmitter;

  /**
   * This boolean specifies redirection to the Identity Provider should happen in
   * the main window or in an iframe, thus making the redirect invisible to the
   * user. Such redirection may only succeed in the case of silent authentication,
   * if a cookie is set for the IdP and this cookie is included by the iframe.
   */
  inIframe?: boolean;
}
