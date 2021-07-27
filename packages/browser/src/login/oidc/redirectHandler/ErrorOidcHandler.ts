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

 import {
    IRedirectHandler,
    ISessionInfo,
  } from "@inrupt/solid-client-authn-core";
import { getDefaultSession, handleIncomingRedirect } from "../../../defaultSession";
  
  import { getUnauthenticatedSession } from "../../../sessionInfo/SessionInfoManager";
  
  /**
   * This class handles redirect IRIs without any query params, and returns an unauthenticated
   * session. It serves as a fallback so that consuming libraries don't have to test
   * for the query params themselves, and can always try to use them as a redirect IRI.
   * @hidden
   */
  export class ErrorOidcHandler implements IRedirectHandler {
    async canHandle(redirectUrl: string): Promise<boolean> {
      try {
        // eslint-disable-next-line no-new
        return new URL(redirectUrl).searchParams.has("error");
      } catch (e) {
        throw new Error(
          `[${redirectUrl}] is not a valid URL, and cannot be used as a redirect URL: ${e.toString()}`
        );
      }
    }
  
    async handle(
      redirectUrl: string
    ): Promise<ISessionInfo & { fetch: typeof fetch }> {
      
      let sessionInfo : ISessionInfo;
      const url = new URL(redirectUrl);

      // calls private setSessionInfo() with correct credentials
      const session = getDefaultSession();
      session.onLoginError();

      // maybe this instead?
      sessionInfo = {
          isLoggedIn : false,
          webId : undefined,
          sessionId : undefined,
          experirationDate : undefined
      }

      // will need to pass these in somewhere
      const errorUrl = url.searchParams.get("error");
      const errorDescriptionUrl = url.searchParams.get("errorDescription");
      // don't call here
      errorCallback(errorUrl, errorDescriptionUrl);

      // example error callback function
      function errorCallback(error: string | null, errorDescription: string | null){
        throw new Error(error + " : " + errorDescription); 
      }

      // run callback
      handleIncomingRedirect(errorCallback, {});

      // clean up URL, return somewhere...
      url.searchParams.delete("error");
      url.searchParams.delete("errorDescription");

      return sessionInfo;

      // return session
      
    }
  }
  