/**
 * Top Level core document. Responsible for setting up the dependency graph
 */
import "reflect-metadata";
import { container } from "tsyringe";
import AuthFetcher from "./AuthFetcher";
import IAuthenticatedFetcher from "./authenticatedFetch/IAuthenticatedFetcher";
import AggregateAuthenticatedFetcher from "./authenticatedFetch/AggregateAuthenticatedFetcher";
import DpopAuthenticatedFetcher from "./authenticatedFetch/dpop/DpopAuthenticatedFetcher";
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
  useClass: AggregateAuthenticatedFetcher
});
container.register<IAuthenticatedFetcher>("authenticatedFetchers", {
  useClass: DpopAuthenticatedFetcher
});
container.register<IAuthenticatedFetcher>("authenticatedFetchers", {
  useClass: BearerAuthenticatedFetcher
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
