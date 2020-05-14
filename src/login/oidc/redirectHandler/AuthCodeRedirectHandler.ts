/**
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

import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IIssuerConfigFetcher } from "../IssuerConfigFetcher";
import IIssuerConfig from "../IIssuerConfig";
import { IFetcher } from "../../../util/Fetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import formurlencoded from "form-urlencoded";
import { ITokenSaver } from "./TokenSaver";
import { IRedirector } from "../Redirector";
import btoa from "btoa";

@injectable()
export default class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("fetcher") private fetcher: IFetcher,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("tokenSaver") private tokenSaver: ITokenSaver,
    @inject("redirector") private redirector: IRedirector
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.code && url.query.state);
  }

  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const url = new URL(redirectUrl, true);
    const localUserId = url.query.state as string;
    const [
      codeVerifier,
      issuer,
      clientId,
      redirectUri,
      clientSecret
    ] = await Promise.all([
      (await this.storageUtility.getForUser(
        localUserId,
        "codeVerifier",
        true
      )) as string,
      (await this.storageUtility.getForUser(
        localUserId,
        "issuer",
        true
      )) as string,
      (await this.storageUtility.getForUser(
        localUserId,
        "clientId",
        true
      )) as string,
      (await this.storageUtility.getForUser(
        localUserId,
        "redirectUri",
        true
      )) as string,
      (await this.storageUtility.getForUser(
        localUserId,
        "clientSecret"
      )) as string
    ]);

    const issuerConfig = (await this.issuerConfigFetcher.fetchConfig(
      new URL(issuer)
    )) as IIssuerConfig;

    const tokenRequestInit: RequestInit = {
      method: "POST",
      headers: {
        DPoP: await this.dpopHeaderCreator.createHeaderToken(
          issuerConfig.tokenEndpoint,
          "POST"
        ),
        "content-type": "application/x-www-form-urlencoded"
      },
      /* eslint-disable @typescript-eslint/camelcase */
      body: formurlencoded({
        client_id: clientId as string,
        grant_type: "authorization_code",
        code_verifier: codeVerifier as string,
        code: url.query.code as string,
        redirect_uri: redirectUri as string
      })
      /* eslint-enable @typescript-eslint/camelcase */
    };

    if (clientSecret) {
      console.log(clientId);
      console.log(clientSecret);
      (tokenRequestInit.headers as Record<
        string,
        string
      >).Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    const tokenResponse = await (
      await this.fetcher.fetch(issuerConfig.tokenEndpoint, tokenRequestInit)
    ).json();

    // TODO: should handle error if the token response is something strange

    const session = await this.tokenSaver.saveTokenAndGetSession(
      localUserId,
      tokenResponse.id_token,
      tokenResponse.access_token
    );

    delete url.query.code;
    delete url.query.state;
    session.neededAction = this.redirector.redirect(url.toString(), {
      redirectByReplacingState: true
    });

    return session;
  }
}
