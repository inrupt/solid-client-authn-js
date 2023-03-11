//
// Copyright 2022 Inrupt Inc.
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
import { EventEmitter } from "events";
import { EVENTS } from "@inrupt/solid-client-authn-core";

export class SessionEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
  // The overloads should not be line-separated.
  /* eslint-disable lines-between-class-members */
  /**
   * Register a listener called on successful login with the logged in WebID.
   * @param eventName
   * @param listener
   */
  on(eventName: typeof EVENTS.LOGIN, listener: (webid: string) => void): this;
  /**
   * Register a listener called on successful logout.
   * @param eventName
   * @param listener
   */
  on(eventName: typeof EVENTS.LOGOUT, listener: () => void): this;
  /**
   * Register a listener called on session expiration.
   * @param eventName
   * @param listener
   */
  on(eventName: typeof EVENTS.SESSION_EXPIRED, listener: () => void): this;
  /**
   * Register a listener called on session restoration after a silent login.
   * @param eventName
   * @param listener
   */
  on(
    eventName: typeof EVENTS.SESSION_RESTORED,
    listener: (currentUrl: string) => unknown
  ): this;
  /**
   * Register a listener called on error, with an error identifier and description.
   * @param eventName
   * @param listener
   */
  on(
    eventName: typeof EVENTS.ERROR,
    listener: (
      error: string | null,
      errorDescription?: string | null
    ) => unknown
  ): this;
  /**
   * Register a listener called on session extension.
   * @param eventName
   * @param listener
   */
  on(
    eventName: typeof EVENTS.SESSION_EXTENDED,
    listener: (expiresIn: number) => void
  ): this;
  on(
    eventName: Parameters<InstanceType<typeof EventEmitter>["on"]>[0],
    listener: Parameters<InstanceType<typeof EventEmitter>["on"]>[1]
  ): this {
    return super.on(eventName, listener);
  }

  /**
   * Register a listener called on the next successful login with the logged in WebID.
   * @param eventName
   * @param listener
   */
  once(eventName: typeof EVENTS.LOGIN, listener: (webid: string) => void): this;
  /**
   * Register a listener called on the next successful logout.
   * @param eventName
   * @param listener
   */
  once(eventName: typeof EVENTS.LOGOUT, listener: () => void): this;
  /**
   * Register a listener called on the next session expiration.
   * @param eventName
   * @param listener
   */
  once(eventName: typeof EVENTS.SESSION_EXPIRED, listener: () => void): this;
  /**
   * Register a listener called on the next session restoration after a silent login.
   * @param eventName
   * @param listener
   */
  once(
    eventName: typeof EVENTS.SESSION_RESTORED,
    listener: (currentUrl: string) => unknown
  ): this;
  /**
   * Register a listener called on the next error, with an error identifier and description.
   * @param eventName
   * @param listener
   */
  once(
    eventName: typeof EVENTS.ERROR,
    listener: (
      error: string | null,
      errorDescription?: string | null
    ) => unknown
  ): this;
  /**
   * Register a listener called on the next session extension.
   * @param eventName
   * @param listener
   */
  once(
    eventName: typeof EVENTS.SESSION_EXTENDED,
    listener: (expiresIn: number) => void
  ): this;
  once(
    eventName: Parameters<InstanceType<typeof EventEmitter>["on"]>[0],
    listener: Parameters<InstanceType<typeof EventEmitter>["on"]>[1]
  ): this {
    return super.once(eventName, listener);
  }

  /**
   * Unegister a listener called on successful login with the logged in WebID.
   * @param eventName
   * @param listener
   */
  off(eventName: typeof EVENTS.LOGIN, listener: (webid: string) => void): this;
  /**
   * Unegister a listener called on successful logout.
   * @param eventName
   * @param listener
   */
  off(eventName: typeof EVENTS.LOGOUT, listener: () => void): this;
  /**
   * Unegister a listener called on session expiration.
   * @param eventName
   * @param listener
   */
  off(eventName: typeof EVENTS.SESSION_EXPIRED, listener: () => void): this;
  /**
   * Unegister a listener called on session restoration after a silent login.
   * @param eventName
   * @param listener
   */
  off(
    eventName: typeof EVENTS.SESSION_RESTORED,
    listener: (currentUrl: string) => unknown
  ): this;
  /**
   * Unegister a listener called on error, with an error identifier and description.
   * @param eventName
   * @param listener
   */
  off(
    eventName: typeof EVENTS.ERROR,
    listener: (
      error: string | null,
      errorDescription?: string | null
    ) => unknown
  ): this;
  /**
   * Unegister a listener called on session extension.
   * @param eventName
   * @param listener
   */
  off(
    eventName: typeof EVENTS.SESSION_EXTENDED,
    listener: (expiresIn: number) => void
  ): this;
  off(
    eventName: Parameters<InstanceType<typeof EventEmitter>["on"]>[0],
    listener: Parameters<InstanceType<typeof EventEmitter>["on"]>[1]
  ): this {
    return super.off(eventName, listener);
  }
  /* eslint-enable lines-between-class-members */
}
