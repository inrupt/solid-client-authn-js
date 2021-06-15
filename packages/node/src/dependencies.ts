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
import "reflect-metadata";
import { container as emptyContainer } from "tsyringe";
import {
  IClientRegistrar,
  IIssuerConfigFetcher,
  ILoginHandler,
  ILogoutHandler,
  IOidcHandler,
  IRedirector,
  IRedirectHandler,
  IStorage,
  IStorageUtility,
  ISessionInfoManager,
  InMemoryStorage,
} from "@inrupt/solid-client-authn-core";
import StorageUtilityNode from "./storage/StorageUtility";
import ClientAuthentication from "./ClientAuthentication";
import OidcLoginHandler from "./login/oidc/OidcLoginHandler";
import AggregateOidcHandler from "./login/oidc/AggregateOidcHandler";
import AuthorizationCodeWithPkceOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import ClientCredentialsOidcHandler from "./login/oidc/oidcHandlers/ClientCredentialsOidcHandler";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import IssuerConfigFetcher from "./login/oidc/IssuerConfigFetcher";
import { FallbackRedirectHandler } from "./login/oidc/redirectHandler/FallbackRedirectHandler";
import GeneralLogoutHandler from "./logout/GeneralLogoutHandler";
import { SessionInfoManager } from "./sessionInfo/SessionInfoManager";
import { AuthCodeRedirectHandler } from "./login/oidc/redirectHandler/AuthCodeRedirectHandler";
import AggregateRedirectHandler from "./login/oidc/redirectHandler/AggregateRedirectHandler";
import Redirector from "./login/oidc/Redirector";
import ClientRegistrar from "./login/oidc/ClientRegistrar";
import TokenRefresher, {
  ITokenRefresher,
} from "./login/oidc/refresh/TokenRefresher";
import TokenRequester, { ITokenRequester } from "./login/oidc/TokenRequester";
import AggregateLoginHandler from "./login/AggregateLoginHandler";

const container = emptyContainer;

container.register<IStorageUtility>("node:storageUtility", {
  useClass: StorageUtilityNode,
});

// Session
container.register<ISessionInfoManager>("node:sessionInfoManager", {
  useClass: SessionInfoManager,
});

// Login
container.register<ILoginHandler>("node:loginHandler", {
  useClass: AggregateLoginHandler,
});
container.register<ILoginHandler>("node:loginHandlers", {
  useClass: OidcLoginHandler,
});

// Login/OIDC
container.register<IOidcHandler>("node:oidcHandler", {
  useClass: AggregateOidcHandler,
});
container.register<IOidcHandler>("node:oidcHandlers", {
  useClass: RefreshTokenOidcHandler,
});

container.register<IOidcHandler>("node:oidcHandlers", {
  useClass: AuthorizationCodeWithPkceOidcHandler,
});

container.register<IOidcHandler>("node:oidcHandlers", {
  useClass: ClientCredentialsOidcHandler,
});

container.register<IRedirector>("node:redirector", {
  useClass: Redirector,
});
container.register<IClientRegistrar>("node:clientRegistrar", {
  useClass: ClientRegistrar,
});
container.register<ITokenRequester>("node:tokenRequester", {
  useClass: TokenRequester,
});

// Login/OIDC/redirectHandler
container.register<IRedirectHandler>("node:redirectHandler", {
  useClass: AggregateRedirectHandler,
});
container.register<IRedirectHandler>("node:redirectHandlers", {
  useClass: AuthCodeRedirectHandler,
});

// This catch-all class will always be able to handle the
// redirect IRI, so it must be registered last in the container
container.register<IRedirectHandler>("node:redirectHandlers", {
  useClass: FallbackRedirectHandler,
});

// Login/OIDC/Issuer
container.register<IIssuerConfigFetcher>("node:issuerConfigFetcher", {
  useClass: IssuerConfigFetcher,
});

// Login/OIDC/Refresh
container.register<ITokenRefresher>("node:tokenRefresher", {
  useClass: TokenRefresher,
});

// Logout
container.register<ILogoutHandler>("node:logoutHandler", {
  useClass: GeneralLogoutHandler,
});

/**
 *
 * @param dependencies
 * @deprecated This function will be removed from the external API in an upcoming release.
 */
export function getClientAuthenticationWithDependencies(dependencies: {
  secureStorage?: IStorage;
  insecureStorage?: IStorage;
}): ClientAuthentication {
  const storage = new InMemoryStorage();
  const secureStorage = dependencies.secureStorage || storage;
  const insecureStorage = dependencies.insecureStorage || storage;

  const authenticatorContainer = container.createChildContainer();
  authenticatorContainer.register<IStorage>("node:secureStorage", {
    useValue: secureStorage,
  });
  authenticatorContainer.register<IStorage>("node:insecureStorage", {
    useValue: insecureStorage,
  });
  return authenticatorContainer.resolve(ClientAuthentication);
}
