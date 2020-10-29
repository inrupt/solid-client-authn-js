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
import LegacyImplicitFlowOidcHandler from "./login/oidc/oidcHandlers/LegacyImplicitFlowOidcHandler";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import Fetcher, { IFetcher } from "./util/Fetcher";
import IssuerConfigFetcher from "./login/oidc/IssuerConfigFetcher";
import { ImplicitRedirectHandler } from "./login/oidc/redirectHandler/ImplicitRedirectHandler";
import { FallbackRedirectHandler } from "./login/oidc/redirectHandler/FallbackRedirectHandler";
import EnvironmentDetector, {
  IEnvironmentDetector,
  detectEnvironment,
} from "./util/EnvironmentDetector";
import GeneralLogoutHandler from "./logout/GeneralLogoutHandler";
import { SessionInfoManager } from "./sessionInfo/SessionInfoManager";
import { AuthCodeRedirectHandler } from "./login/oidc/redirectHandler/AuthCodeRedirectHandler";
import AggregateRedirectHandler from "./login/oidc/redirectHandler/AggregateRedirectHandler";
import BrowserStorage from "./storage/BrowserStorage";
import TokenSaver, {
  ITokenSaver,
} from "./login/oidc/redirectHandler/TokenSaver";
import Redirector from "./login/oidc/Redirector";
import PopUpLoginHandler from "./login/popUp/PopUpLoginHandler";
import AggregatePostPopUpLoginHandler from "./login/popUp/AggregatePostPopUpLoginHandler";
import ClientRegistrar from "./login/oidc/ClientRegistrar";
import TokenRefresher, {
  ITokenRefresher,
} from "./login/oidc/refresh/TokenRefresher";
import TokenRequester, { ITokenRequester } from "./login/oidc/TokenRequester";
import InMemoryStorage from "./storage/InMemoryStorage";
import { ISessionManager, SessionManager } from "./SessionManager";
import AggregateLoginHandler from "./login/AggregateLoginHandler";

const container = emptyContainer;

container.register<IStorageUtility>("storageUtility", {
  useClass: StorageUtilityBrowser,
});

// Util
container.register<IFetcher>("fetcher", {
  useClass: Fetcher,
});
container.register<IEnvironmentDetector>("environmentDetector", {
  useClass: EnvironmentDetector,
});

// Session
container.register<ISessionInfoManager>("sessionInfoManager", {
  useClass: SessionInfoManager,
});
container.register<ISessionManager>("sessionManager", {
  useClass: SessionManager,
});

// Login
container.register<ILoginHandler>("loginHandler", {
  useClass: AggregateLoginHandler,
});
container.register<ILoginHandler>("loginHandlers", {
  useClass: PopUpLoginHandler,
});
container.register<ILoginHandler>("loginHandlers", {
  useClass: OidcLoginHandler,
});

container.register<ILoginHandler>("postPopUpLoginHandler", {
  useClass: AggregatePostPopUpLoginHandler,
});
container.register<ILoginHandler>("postPopUpLoginHandlers", {
  useClass: OidcLoginHandler,
});

// Login/OIDC
container.register<IOidcHandler>("oidcHandler", {
  useClass: AggregateOidcHandler,
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: RefreshTokenOidcHandler,
});

container.register<IOidcHandler>("oidcHandlers", {
  useClass: AuthorizationCodeOidcHandler,
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: AuthorizationCodeWithPkceOidcHandler,
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: LegacyImplicitFlowOidcHandler,
});

container.register<IOidcHandler>("oidcHandlers", {
  useClass: ClientCredentialsOidcHandler,
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: PrimaryDeviceOidcHandler,
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: SecondaryDeviceOidcHandler,
});

container.register<IRedirector>("redirector", {
  useClass: Redirector,
});
container.register<IClientRegistrar>("clientRegistrar", {
  useClass: ClientRegistrar,
});
container.register<ITokenRequester>("tokenRequester", {
  useClass: TokenRequester,
});

// Login/OIDC/redirectHandler
container.register<IRedirectHandler>("redirectHandler", {
  useClass: AggregateRedirectHandler,
});
container.register<IRedirectHandler>("redirectHandlers", {
  useClass: AuthCodeRedirectHandler,
});
container.register<IRedirectHandler>("redirectHandlers", {
  useClass: ImplicitRedirectHandler,
});
container.register<ITokenSaver>("tokenSaver", {
  useClass: TokenSaver,
});
// This catch-all class will always be able to handle the
// redirect IRI, so it must be registered last in the container
container.register<IRedirectHandler>("redirectHandlers", {
  useClass: FallbackRedirectHandler,
});

// Login/OIDC/Issuer
container.register<IIssuerConfigFetcher>("issuerConfigFetcher", {
  useClass: IssuerConfigFetcher,
});

// Login/OIDC/Refresh
container.register<ITokenRefresher>("tokenRefresher", {
  useClass: TokenRefresher,
});

// Logout
container.register<ILogoutHandler>("logoutHandler", {
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
  let secureStorage;
  let insecureStorage;

  switch (detectEnvironment()) {
    case "browser":
    case "react-native":
      // TODO: change this to be secure
      secureStorage = dependencies.secureStorage || new InMemoryStorage();
      insecureStorage = dependencies.insecureStorage || new BrowserStorage();
      break;
    case "server":
      secureStorage = dependencies.secureStorage || new InMemoryStorage();
      insecureStorage = dependencies.insecureStorage || new InMemoryStorage();
      break;
  }
  const authenticatorContainer = container.createChildContainer();
  authenticatorContainer.register<IStorage>("secureStorage", {
    useValue: secureStorage,
  });
  authenticatorContainer.register<IStorage>("insecureStorage", {
    useValue: insecureStorage,
  });
  return authenticatorContainer.resolve(ClientAuthentication);
}
