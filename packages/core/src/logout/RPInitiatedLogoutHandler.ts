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

/**
 * @hidden
 * @packageDocumentation
 */

import {
  ILogoutHandler,
  ISessionInfoManager,
} from "@inrupt/solid-client-authn-core";
import IStorageUtility from "../storage/IStorageUtility";
import { IIssuerConfigFetcher } from "../login/oidc/IIssuerConfigFetcher";
import { getEndSessionUrl } from './endSessionUrl';

interface RPLogoutOptions {
  logoutType: "idp",
  postLogoutUrl?: string | undefined,
  state?: string | undefined,
}

interface AppLogoutOptions {
  logoutType: "app",
  postLogoutUrl?: undefined,
  state?: undefined,
}

/**
 * @hidden
 * This might need to be a base and then we vary the behavior between redirecting in the browser and fetching in node
 */
export default class RPInitiatedLogoutHandler implements ILogoutHandler {
  constructor(private sessionInfoManager: ISessionInfoManager, private configFetcher: IIssuerConfigFetcher) {}

  /**
   * Get the issuer config pertaining to the current user session
   */
  private async getEndSessionEndpoint(sessionId: string): Promise<string> {
    const issuer = (await this.sessionInfoManager.get(sessionId))?.issuer;

    if (typeof issuer !== 'string')
      throw new Error("Issuer not found");
    
    const { endSessionEndpoint } = await this.configFetcher.fetchConfig(issuer);

    if (typeof endSessionEndpoint !== 'string')
      throw new Error("Could not find end_session_endpoint");
    
    return endSessionEndpoint;
  }

  protected async getEndSessionUrl(userId: string, options: RPLogoutOptions): Promise<string> {
    return getEndSessionUrl({
      end_session_endpoint: await this.getEndSessionEndpoint(userId),
      post_logout_redirect_uri: options.postLogoutUrl,
      state: options.state
    });
  }

  async canHandle(userId: string): Promise<boolean> {
    try {
      await this.getEndSessionEndpoint(userId);
      return true;
    } catch {
      return false;
    }
  }

  async handle(userId: string, options: RPLogoutOptions): Promise<void> {
    const url = getEndSessionUrl({
      end_session_endpoint: await this.getEndSessionEndpoint(userId),
      post_logout_redirect_uri: options.postLogoutUrl,
      state: options.state
    });
  }
}
