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

import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../../util/Fetcher";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IIssuerConfigFetcher } from "../IssuerConfigFetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import URL from "url-parse";
import formurlencoded from "form-urlencoded";

export interface ITokenRefresher {
  refresh(localUserId: string): Promise<void>;
}

@injectable()
export default class TokenRefresher implements ITokenRefresher {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator
  ) {}

  async refresh(localUserId: string): Promise<void> {
    // Get the refresh token and the issuer
    const [refreshToken, issuer, clientId, clientSecret] = await Promise.all([
      this.storageUtility.getForUser(localUserId, "refreshToken", true),
      this.storageUtility.getForUser(localUserId, "issuer", true),
      this.storageUtility.getForUser(localUserId, "clientId", true),
      this.storageUtility.getForUser(localUserId, "clientSecret")
    ]);

    // Get the issuer config to find the token url
    const issuerConfig = await this.issuerConfigFetcher.fetchConfig(
      new URL(issuer as string)
    );
    if (
      !issuerConfig.grantTypesSupported ||
      !issuerConfig.grantTypesSupported.includes("refresh_token")
    ) {
      throw new Error(
        `The issuer ${issuer} does not support the refresh token grant`
      );
    }
    if (!issuerConfig.tokenEndpoint) {
      throw new Error(`This issuer ${issuer} does not have a token endpoint`);
    }

    // Perform refresh token flow
    const tokenRequestInit: RequestInit & {
      headers: Record<string, string>;
    } = {
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
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
      /* eslint-enable @typescript-eslint/camelcase */
    };

    if (clientSecret) {
      tokenRequestInit.headers.Authorization = `Basic ${this.btoa(
        `${clientId}:${clientSecret}`
      )}`;
    }

    const tokenResponse = await (
      await this.fetcher.fetch(issuerConfig.tokenEndpoint, tokenRequestInit)
    ).json();

    // Check the response
    if (
      !(
        tokenResponse &&
        tokenResponse.access_token &&
        tokenResponse.id_token &&
        typeof tokenResponse.access_token === "string" &&
        typeof tokenResponse.id_token === "string" &&
        (!tokenResponse.refresh_token ||
          typeof tokenResponse.refresh_token === "string")
      )
    ) {
      throw new Error("IDP /token route returned an invalid response.");
    }

    await this.storageUtility.setForUser(
      localUserId,
      "accessToken",
      tokenResponse.access_token as string
    );
    await this.storageUtility.setForUser(
      localUserId,
      "idToken",
      tokenResponse.id_token as string
    );
    await this.storageUtility.setForUser(
      localUserId,
      "refreshToken",
      tokenResponse.refresh_token as string
    );
  }

  private btoa(str: string): string {
    return Buffer.from(str.toString(), "binary").toString("base64");
  }
}
