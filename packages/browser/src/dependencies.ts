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
import StorageUtilityBrowser from "./storage/StorageUtility";
import ClientAuthentication from "./ClientAuthentication";
import OidcLoginHandler from "./login/oidc/OidcLoginHandler";
import AggregateOidcHandler from "./login/oidc/AggregateOidcHandler";
import AuthorizationCodeOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeOidcHandler";
import AuthorizationCodeWithPkceOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import ClientCredentialsOidcHandler from "./login/oidc/oidcHandlers/ClientCredentialsOidcHandler";
import PrimaryDeviceOidcHandler from "./login/oidc/oidcHandlers/PrimaryDeviceOidcHandler";
import SecondaryDeviceOidcHandler from "./login/oidc/oidcHandlers/SecondaryDeviceOidcHandler";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import IssuerConfigFetcher from "./login/oidc/IssuerConfigFetcher";
import { FallbackRedirectHandler } from "./login/oidc/redirectHandler/FallbackRedirectHandler";
import GeneralLogoutHandler from "./logout/GeneralLogoutHandler";
import { SessionInfoManager } from "./sessionInfo/SessionInfoManager";
import { AuthCodeRedirectHandler } from "./login/oidc/redirectHandler/AuthCodeRedirectHandler";
import AggregateRedirectHandler from "./login/oidc/redirectHandler/AggregateRedirectHandler";
import BrowserStorage from "./storage/BrowserStorage";
import Redirector from "./login/oidc/Redirector";
import ClientRegistrar from "./login/oidc/ClientRegistrar";
import { ISessionManager, SessionManager } from "./SessionManager";
import AggregateLoginHandler from "./login/AggregateLoginHandler";

const container = emptyContainer;

container.register<IStorageUtility>("browser:storageUtility", {
  useClass: StorageUtilityBrowser,
});

// Session
container.register<ISessionInfoManager>("browser:sessionInfoManager", {
  useClass: SessionInfoManager,
});
container.register<ISessionManager>("browser:sessionManager", {
  useClass: SessionManager,
});

// Login
container.register<ILoginHandler>("browser:loginHandler", {
  useClass: AggregateLoginHandler,
});
container.register<ILoginHandler>("browser:loginHandlers", {
  useClass: OidcLoginHandler,
});

// Login/OIDC
container.register<IOidcHandler>("browser:oidcHandler", {
  useClass: AggregateOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: RefreshTokenOidcHandler,
});

container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: AuthorizationCodeOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: AuthorizationCodeWithPkceOidcHandler,
});

container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: ClientCredentialsOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: PrimaryDeviceOidcHandler,
});
container.register<IOidcHandler>("browser:oidcHandlers", {
  useClass: SecondaryDeviceOidcHandler,
});

container.register<IRedirector>("browser:redirector", {
  useClass: Redirector,
});
container.register<IClientRegistrar>("browser:clientRegistrar", {
  useClass: ClientRegistrar,
});

// Login/OIDC/redirectHandler
container.register<IRedirectHandler>("browser:redirectHandler", {
  useClass: AggregateRedirectHandler,
});
container.register<IRedirectHandler>("browser:redirectHandlers", {
  useClass: AuthCodeRedirectHandler,
});
// This catch-all class will always be able to handle the
// redirect IRI, so it must be registered last in the container
container.register<IRedirectHandler>("browser:redirectHandlers", {
  useClass: FallbackRedirectHandler,
});

// Login/OIDC/Issuer
container.register<IIssuerConfigFetcher>("browser:issuerConfigFetcher", {
  useClass: IssuerConfigFetcher,
});

// Logout
container.register<ILogoutHandler>("browser:logoutHandler", {
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
  const secureStorage = dependencies.secureStorage || new InMemoryStorage();
  const insecureStorage = dependencies.insecureStorage || new BrowserStorage();

  const authenticatorContainer = container.createChildContainer();
  authenticatorContainer.register<IStorage>("browser:secureStorage", {
    useValue: secureStorage,
  });
  authenticatorContainer.register<IStorage>("browser:insecureStorage", {
    useValue: insecureStorage,
  });
  return authenticatorContainer.resolve(ClientAuthentication);
}
