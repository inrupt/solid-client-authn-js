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

import URL from "url-parse";
import ConfigurationError from "../../../errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import {
  IRedirector,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { OidcClient } from "@inrupt/oidc-dpop-client-browser";
import IJoseUtility from "../../../jose/IJoseUtility";
import { buildBearerFetch } from "../../../authenticatedFetch/fetchFactory";

/**
 * @hidden
 */
@injectable()
export default class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("redirector") private redirector: IRedirector,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.code && url.query.state);
  }

  async handle(
    redirectUrl: string
  ): Promise<ISessionInfo & { fetch: typeof fetch }> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(
        `Cannot handle redirect url [${redirectUrl}]`
      );
    }
    const url = new URL(redirectUrl, true);
    const oauthState = url.query.state as string;

    const storedSessionId = (await this.storageUtility.getForUser(
      oauthState,
      "sessionId",
      {
        errorIfNull: true,
      }
    )) as string;

    let signinResponse;
    try {
      signinResponse = await new OidcClient({
        // TODO: We should look at the various interfaces being used for storage,
        //  i.e. between oidc-client-js (WebStorageStoreState), localStorage
        //  (which has an interface Storage), and our own proprietary interface
        //  IStorage - i.e. we should really just be using the browser Web Storage
        //  API, e.g. "stateStore: window.localStorage,".

        // We are instantiating a new instance here, so the only value we need to
        // explicitly provide is the response mode (default otherwise will look
        // for a hash '#' fragment!).
        // eslint-disable-next-line @typescript-eslint/camelcase
        response_mode: "query",
        // The userinfo endpoint on NSS fails, so disable this for now
        // Note that in Solid, information should be retrieved from the
        // profile referenced by the WebId.
        loadUserInfo: false,
      }).processSigninResponse(redirectUrl.toString());
    } catch (err) {
      throw new Error(
        `Problem handling Auth Code Grant (Flow) redirect - URL [${redirectUrl}]: ${err}`
      );
    }

    // We need to decode the access_token JWT to extract out the full WebID.
    const decoded = await this.joseUtility.decodeJWT(
      signinResponse.access_token as string
    );
    if (!decoded || !decoded.sub) {
      throw new Error("The idp returned a bad token without a sub.");
    }

    await this.storageUtility.setForUser(
      storedSessionId,
      {
        idToken: signinResponse.id_token,
        // TODO: We need a PR to oidc-client-js to add parsing of the
        //  refresh_token from the redirect URL.
        refreshToken:
          "<Refresh token that *is* coming back in the redirect URL is not yet being parsed and provided by oidc-client-js in it's response object>",
        webId: decoded.sub as string,
        isLoggedIn: "true",
      },
      { secure: true }
    );

    const sessionInfo = await this.sessionInfoManager.get(storedSessionId);
    if (!sessionInfo) {
      throw new Error(`Could not retrieve session: [${storedSessionId}].`);
    }

    return Object.assign(sessionInfo, {
      // TODO: When handling DPoP, both the key and the token should be returned
      // by the redirect handler.
      fetch: buildBearerFetch(signinResponse.access_token),
    });
  }
}
