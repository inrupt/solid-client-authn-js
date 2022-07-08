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
 * @hidden
 * @packageDocumentation
 */

/**
 * Responsible for selecting the correct OidcHandler to handle the provided OIDC Options
 */
import {
  IIncomingRedirectHandler,
  ISessionInfo,
  AggregateHandler,
  HeadersAuthenticator,
} from "@inrupt/solid-client-authn-core";
import { EventEmitter } from "events";

/**
 * @hidden
 */
export default class AggregateIncomingRedirectHandler
  extends AggregateHandler<
    [string, EventEmitter],
    ISessionInfo & {
      fetch: typeof fetch;
      headersAuthenticator: HeadersAuthenticator;
    }
  >
  implements IIncomingRedirectHandler
{
  constructor(redirectHandlers: IIncomingRedirectHandler[]) {
    super(redirectHandlers);
  }
}
