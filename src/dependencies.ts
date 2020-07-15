/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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
 * Top Level core document. Responsible for setting up the dependency graph
 */
import "reflect-metadata";
import { container } from "tsyringe";
import AuthFetcher from "./AuthFetcher";
import IAuthenticatedFetcher from "./authenticatedFetch/IAuthenticatedFetcher";
import AggregateAuthenticatedFetcher from "./authenticatedFetch/AggregateAuthenticatedFetcher";
import DpopAuthenticatedFetcher from "./authenticatedFetch/dpop/DpopAuthenticatedFetcher";
import UnauthenticatedFetcher from "./authenticatedFetch/unauthenticated/UnauthenticatedFetcher";
import ILoginHandler from "./login/ILoginHandler";
import AggregateLoginHandler from "./login/AggregateLoginHandler";
import IStorage from "./localStorage/IStorage";
import IJoseUtility from "./jose/IJoseUtility";
import IsomorphicJoseUtility from "./jose/IsomorphicJoseUtility";
import OidcLoginHandler from "./login/oidc/OidcLoginHandler";
import IOidcHandler from "./login/oidc/IOidcHandler";
import AggregateOidcHandler from "./login/oidc/AggregateOidcHandler";
import AuthorizationCodeOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeOidcHandler";
import AuthorizationCodeWithPkceOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import ClientCredentialsOidcHandler from "./login/oidc/oidcHandlers/ClientCredentialsOidcHandler";
import PrimaryDeviceOidcHandler from "./login/oidc/oidcHandlers/PrimaryDeviceOidcHandler";
import SecondaryDeviceOidcHandler from "./login/oidc/oidcHandlers/SecondaryDeviceOidcHandler";
import LegacyImplicitFlowOidcHandler from "./login/oidc/oidcHandlers/LegacyImplicitFlowOidcHandler";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import Fetcher, { IFetcher } from "./util/Fetcher";
import IssuerConfigFetcher, {
  IIssuerConfigFetcher
} from "./login/oidc/IssuerConfigFetcher";
import BearerAuthenticatedFetcher from "./authenticatedFetch/bearer/BearerAuthenticatedFetcher";
import DpopHeaderCreator, {
  IDpopHeaderCreator
} from "./dpop/DpopHeaderCreator";
import DpopClientKeyManager, {
  IDpopClientKeyManager
} from "./dpop/DpopClientKeyManager";
import StorageUtility, { IStorageUtility } from "./localStorage/StorageUtility";
import UuidGenerator, { IUuidGenerator } from "./util/UuidGenerator";
import NodeStorage from "./localStorage/NodeStorage";
import IRedirectHandler from "./login/oidc/redirectHandler/IRedirectHandler";
import GeneralRedirectHandler from "./login/oidc/redirectHandler/GeneralRedirectHandler";
import EnvironmentDetector, {
  IEnvironmentDetector
} from "./util/EnvironmentDetector";
import ILogoutHandler from "./logout/ILogoutHandler";
import GeneralLogoutHandler from "./logout/GeneralLogoutHandler";
import UrlRepresenationConverter, {
  IUrlRepresentationConverter
} from "./util/UrlRepresenationConverter";
import SessionCreator, { ISessionCreator } from "./solidSession/SessionCreator";
import AuthCodeRedirectHandler from "./login/oidc/redirectHandler/AuthCodeRedirectHandler";
import AggregateRedirectHandler from "./login/oidc/redirectHandler/AggregateRedirectHandler";
import BrowserStorage from "./localStorage/BrowserStorage";
import TokenSaver, {
  ITokenSaver
} from "./login/oidc/redirectHandler/TokenSaver";
import Redirector, { IRedirector } from "./login/oidc/Redirector";
import InactionRedirectHandler from "./login/oidc/redirectHandler/InactionRedirectHandler";
import PopUpLoginHandler from "./login/popUp/PopUpLoginHandler";
import AggregatePostPopUpLoginHandler from "./login/popUp/AggregatePostPopUpLoginHandler";
import ClientRegistrar, {
  IClientRegistrar
} from "./login/oidc/ClientRegistrar";
import TokenRefresher, {
  ITokenRefresher
} from "./login/oidc/refresh/TokenRefresher";
import AutomaticRefreshFetcher from "./authenticatedFetch/AutomaticRefreshFetcher";
import TokenRequester, { ITokenRequester } from "./login/oidc/TokenRequester";

// Util
container.register<IFetcher>("fetcher", {
  useClass: Fetcher
});
container.register<IDpopHeaderCreator>("dpopHeaderCreator", {
  useClass: DpopHeaderCreator
});
container.register<IDpopClientKeyManager>("dpopClientKeyManager", {
  useClass: DpopClientKeyManager
});
container.register<IStorageUtility>("storageUtility", {
  useClass: StorageUtility
});
container.register<IUuidGenerator>("uuidGenerator", {
  useClass: UuidGenerator
});
container.register<IJoseUtility>("joseUtility", {
  useClass: IsomorphicJoseUtility
});
container.register<IEnvironmentDetector>("environmentDetector", {
  useClass: EnvironmentDetector
});
container.register<IUrlRepresentationConverter>("urlRepresentationConverter", {
  useClass: UrlRepresenationConverter
});

// Session
container.register<ISessionCreator>("sessionCreator", {
  useClass: SessionCreator
});

// Authenticated Fetcher
container.register<IAuthenticatedFetcher>("authenticatedFetcher", {
  useClass: AutomaticRefreshFetcher
});
container.register<IAuthenticatedFetcher>("aggregateAuthenticatedFetcher", {
  useClass: AggregateAuthenticatedFetcher
});
container.register<IAuthenticatedFetcher>("authenticatedFetchers", {
  useClass: DpopAuthenticatedFetcher
});
container.register<IAuthenticatedFetcher>("authenticatedFetchers", {
  useClass: BearerAuthenticatedFetcher
});
container.register<IAuthenticatedFetcher>("authenticatedFetchers", {
  useClass: UnauthenticatedFetcher
});

// Login
container.register<ILoginHandler>("loginHandler", {
  useClass: AggregateLoginHandler
});
container.register<ILoginHandler>("loginHandlers", {
  useClass: PopUpLoginHandler
});
container.register<ILoginHandler>("loginHandlers", {
  useClass: OidcLoginHandler
});

container.register<ILoginHandler>("postPopUpLoginHandler", {
  useClass: AggregatePostPopUpLoginHandler
});
container.register<ILoginHandler>("postPopUpLoginHandlers", {
  useClass: OidcLoginHandler
});

// Login/OIDC
container.register<IOidcHandler>("oidcHandler", {
  useClass: AggregateOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: RefreshTokenOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: AuthorizationCodeOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: AuthorizationCodeWithPkceOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: ClientCredentialsOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: PrimaryDeviceOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: SecondaryDeviceOidcHandler
});
container.register<IOidcHandler>("oidcHandlers", {
  useClass: LegacyImplicitFlowOidcHandler
});
container.register<IRedirector>("redirector", {
  useClass: Redirector
});
container.register<IClientRegistrar>("clientRegistrar", {
  useClass: ClientRegistrar
});
container.register<ITokenRequester>("tokenRequester", {
  useClass: TokenRequester
});

// Login/OIDC/redirectHandler
container.register<IRedirectHandler>("redirectHandler", {
  useClass: AggregateRedirectHandler
});
container.register<IRedirectHandler>("redirectHandlers", {
  useClass: AuthCodeRedirectHandler
});
container.register<IRedirectHandler>("redirectHandlers", {
  useClass: GeneralRedirectHandler
});
container.register<IRedirectHandler>("redirectHandlers", {
  useClass: InactionRedirectHandler
});
container.register<ITokenSaver>("tokenSaver", {
  useClass: TokenSaver
});

// Login/OIDC/Issuer
container.register<IIssuerConfigFetcher>("issuerConfigFetcher", {
  useClass: IssuerConfigFetcher
});

// Login/OIDC/Refresh
container.register<ITokenRefresher>("tokenRefresher", {
  useClass: TokenRefresher
});

// Logout
container.register<ILogoutHandler>("logoutHandler", {
  useClass: GeneralLogoutHandler
});

export default function getAuthFetcherWithDependencies(dependencies: {
  storage?: IStorage;
}): AuthFetcher {
  let storage: IStorage;
  if (dependencies.storage) {
    storage = dependencies.storage;
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore This must be ignored rather than cast to any because the ts compile will not accept an any cast for lib elements
  } else if (typeof document != "undefined") {
    storage = new BrowserStorage();
  } else {
    storage = new NodeStorage();
  }
  const authenticatorContainer = container.createChildContainer();
  authenticatorContainer.register<IStorage>("storage", {
    useValue: storage
  });
  return authenticatorContainer.resolve(AuthFetcher);
}
