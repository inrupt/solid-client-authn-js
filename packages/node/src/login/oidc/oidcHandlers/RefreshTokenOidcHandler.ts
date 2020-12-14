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

/**
 * Handler for the Refresh Token Flow
 */
import {
  IOidcHandler,
  IOidcOptions,
  IStorageUtility,
  LoginResult,
  saveSessionInfoToStorage,
} from "@inrupt/solid-client-authn-core";
import fromKeyLike from "jose/jwk/from_key_like";
import generateKeyPair from "jose/util/generate_key_pair";
import { inject, injectable } from "tsyringe";
import { ISessionInfo } from "../../../../../core/dist";
import {
  buildBearerFetch,
  buildDpopFetch,
  RefreshOptions,
} from "../../../authenticatedFetch/fetchFactory";
import { ITokenRefresher } from "../refresh/TokenRefresher";

function validateOptions(
  oidcLoginOptions: IOidcOptions
): oidcLoginOptions is IOidcOptions & {
  refreshToken: string;
  client: { clientId: string; clientSecret: string };
} {
  return (
    oidcLoginOptions.refreshToken !== undefined &&
    oidcLoginOptions.client.clientId !== undefined
  );
}

/**
 * @hidden
 */
@injectable()
export default class RefreshTokenOidcHandler implements IOidcHandler {
  constructor(
    @inject("tokenRefresher") private tokenRefresher: ITokenRefresher,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return validateOptions(oidcLoginOptions);
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    if (!(await this.canHandle(oidcLoginOptions))) {
      throw new Error(
        `RefreshTokenOidcHandler cannot handle the provided options, missing one of 'refreshToken', 'clientId' in: ${JSON.stringify(
          oidcLoginOptions
        )}`
      );
    }
    const refreshOptions: RefreshOptions = {
      // The type assertion is okay, because it is tested for in canHandle.
      refreshToken: oidcLoginOptions.refreshToken as string,
      sessionId: oidcLoginOptions.sessionId,
      tokenRefresher: this.tokenRefresher,
    };
    let authFetch: typeof fetch;
    const dpopKey = await fromKeyLike(
      (await generateKeyPair("ES256")).privateKey
    );
    // The alg property isn't set by fromKeyLike, so set it manually.
    dpopKey.alg = "ES256";
    if (oidcLoginOptions.dpop) {
      authFetch = await buildDpopFetch(
        // The first request with this empty access token will 401, which will
        // trigger the refresh flow.
        "",
        dpopKey,
        refreshOptions
      );
    } else {
      authFetch = buildBearerFetch(
        // The first request with this empty access token will 401, which will
        // trigger the refresh flow.
        "",
        refreshOptions
      );
    }
    const sessionInfo: ISessionInfo = {
      isLoggedIn: true,
      sessionId: oidcLoginOptions.sessionId,
    };

    await saveSessionInfoToStorage(
      this.storageUtility,
      oidcLoginOptions.sessionId,
      undefined,
      undefined,
      "true",
      oidcLoginOptions.refreshToken as string
    );
    await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
      issuer: oidcLoginOptions.issuer,
      dpop: oidcLoginOptions.dpop ? "true" : "false",
      clientId: oidcLoginOptions.client.clientId,
    });
    if (oidcLoginOptions.client.clientSecret) {
      await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
        clientSecret: oidcLoginOptions.client.clientSecret,
      });
    }
    if (oidcLoginOptions.client.clientName) {
      await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
        clientName: oidcLoginOptions.client.clientName,
      });
    }

    return Object.assign(sessionInfo, {
      fetch: authFetch,
    });
  }
}
