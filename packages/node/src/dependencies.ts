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

/**
 * Top Level core document. Responsible for setting up the dependency graph
 */
import { IStorage, InMemoryStorage } from "@inrupt/solid-client-authn-core";
import StorageUtilityNode from "./storage/StorageUtility";
import ClientAuthentication from "./ClientAuthentication";
import OidcLoginHandler from "./login/oidc/OidcLoginHandler";
import AggregateOidcHandler from "./login/oidc/AggregateOidcHandler";
import AuthorizationCodeWithPkceOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import IssuerConfigFetcher from "./login/oidc/IssuerConfigFetcher";
import { FallbackRedirectHandler } from "./login/oidc/redirectHandler/FallbackRedirectHandler";
import GeneralLogoutHandler from "./logout/GeneralLogoutHandler";
import { SessionInfoManager } from "./sessionInfo/SessionInfoManager";
import { AuthCodeRedirectHandler } from "./login/oidc/redirectHandler/AuthCodeRedirectHandler";
import AggregateRedirectHandler from "./login/oidc/redirectHandler/AggregateRedirectHandler";
import Redirector from "./login/oidc/Redirector";
import ClientRegistrar from "./login/oidc/ClientRegistrar";
import TokenRefresher from "./login/oidc/refresh/TokenRefresher";
import AggregateLoginHandler from "./login/AggregateLoginHandler";

/**
 *
 * @param dependencies
 * @deprecated This function will be removed from the external API in an upcoming release.
 */
export function getClientAuthenticationWithDependencies(dependencies: {
  secureStorage?: IStorage;
  insecureStorage?: IStorage;
}): ClientAuthentication {
  const inMemoryStorage = new InMemoryStorage();
  const secureStorage = dependencies.secureStorage || inMemoryStorage;
  const insecureStorage = dependencies.insecureStorage || inMemoryStorage;

  const storageUtility = new StorageUtilityNode(secureStorage, insecureStorage);

  const issuerConfigFetcher = new IssuerConfigFetcher(storageUtility);
  const clientRegistrar = new ClientRegistrar(storageUtility);

  const sessionInfoManager = new SessionInfoManager(storageUtility);

  const tokenRefresher = new TokenRefresher(
    storageUtility,
    issuerConfigFetcher,
    clientRegistrar
  );

  return new ClientAuthentication(
    // TODO: I don't think we need an Aggregate login handler here at all, since we only use one
    //  anyways...!
    new AggregateLoginHandler([
      new OidcLoginHandler(
        storageUtility,
        new AggregateOidcHandler([
          new RefreshTokenOidcHandler(tokenRefresher, storageUtility),
          new AuthorizationCodeWithPkceOidcHandler(
            storageUtility,
            new Redirector()
          ),
        ]),
        issuerConfigFetcher,
        clientRegistrar
      ),
    ]),
    new AggregateRedirectHandler([
      new AuthCodeRedirectHandler(
        storageUtility,
        sessionInfoManager,
        issuerConfigFetcher,
        clientRegistrar,
        tokenRefresher
      ),
      new FallbackRedirectHandler(),
    ]),
    new GeneralLogoutHandler(sessionInfoManager),
    sessionInfoManager
  );
}
