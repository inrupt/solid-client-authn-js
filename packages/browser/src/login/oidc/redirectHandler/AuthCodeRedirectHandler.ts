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
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { ITokenRequester } from "../TokenRequester";
import {
  IRedirector,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { OidcClient } from "oidc-client";
import IJoseUtility from "../../../jose/IJoseUtility";

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

  async handle(redirectUrl: string): Promise<ISessionInfo | undefined> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(
        `Cannot handle redirect url [${redirectUrl}]`
      );
    }
    const url = new URL(redirectUrl, true);

    const oauthState = url.query.state as string;
    const oauthAuthCode = url.query.code as string;

    const [
      storedSessionId,
      // storedCodeVerifier,
      // storedRedirectUri,
    ] = await Promise.all([
      (await this.storageUtility.getForUser(oauthState, "sessionId", {
        errorIfNull: true,
      })) as string,
      // (await this.storageUtility.getForUser(oauthState, "codeVerifier", {
      //   errorIfNull: true,
      // })) as string,
      // (await this.storageUtility.getForUser(oauthState, "redirectUri", {
      //   errorIfNull: true,
      // })) as string,
    ]);

    // PMCB55: TODO: I think we still need a catch handler around this...
    const signinResponse = await new OidcClient({
      // eslint-disable-next-line @typescript-eslint/camelcase
      response_mode: "query",
    }).processSigninResponse(redirectUrl.toString());

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
        accessToken: signinResponse.access_token as string,
        idToken: signinResponse.id_token as string,
        // TODO: PMCB55: Still need to work out refresh tokens (seems ESS is not
        //  providing it!).
        refreshToken:
          "Refresh Token is not part of 'oidc-client.js' structure for 'signinResponse', and ESS doesn't seem to include it here!",
        webId: decoded.sub as string,
        isLoggedIn: "true",
      },
      { secure: true }
    );

    url.set("query", {});

    const sessionInfo = await this.sessionInfoManager.get(storedSessionId);
    if (!sessionInfo) {
      throw new Error(`Could not retrieve session: [${storedSessionId}].`);
    }
    try {
      this.redirector.redirect(url.toString(), {
        redirectByReplacingState: true,
      });
    } catch (err) {
      // Do nothing
      // This step of the flow should happen in a browser, and redirection
      // should never fail there.
    }

    return sessionInfo;
  }
}
