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

/**
 * @hidden
 * @packageDocumentation
 */

import { injectable } from "tsyringe";
import {
  IRedirectHandler,
  ISessionInfo,
} from "@inrupt/solid-client-authn-core";

import { getUnauthenticatedSession } from "../../../sessionInfo/SessionInfoManager";

/**
 * This class handles redirect IRIs without any query params, and returns an unauthenticated
 * session. It serves as a fallback so that consuming libraries don't have to test
 * for the query params themselves, and can always try to use them as a redirect IRI.
 * @hidden
 */
@injectable()
export class FallbackRedirectHandler implements IRedirectHandler {
  async canHandle(redirectUrl: string): Promise<boolean> {
    try {
      new URL(redirectUrl);
      return true;
    } catch {
      throw new Error(
        `[${redirectUrl}] is not a valid URL, and cannot be used as a redirect URL.`
      );
    }
  }

  async handle(
    // The argument is ignored, but must be present to implement the interface
    _redirectUrl: string
  ): Promise<ISessionInfo & { fetch: typeof fetch }> {
    return getUnauthenticatedSession();
  }
}
