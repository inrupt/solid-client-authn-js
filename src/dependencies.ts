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
import StorageRetriever, {
  IStorageRetriever
} from "./localStorage/StorageRetriever";
import UuidGenerator, { IUuidGenerator } from "./util/UuidGenerator";
import IsomorphicStorage from "./localStorage/IsomorphicStorage";

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
container.register<IStorageRetriever>("storageRetriever", {
  useClass: StorageRetriever
});
container.register<IUuidGenerator>("uuidGenerator", {
  useClass: UuidGenerator
});
container.register<IJoseUtility>("joseUtility", {
  useClass: IsomorphicJoseUtility
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

// Login/OIDC/Issuer
container.register<IIssuerConfigFetcher>("issuerConfigFetcher", {
  useClass: IssuerConfigFetcher
});

export default function getAuthFetcherWithDependencies(dependencies: {
  storage?: IStorage;
}): AuthFetcher {
  const storage = dependencies.storage || new IsomorphicStorage();
  const authenticatorContainer = container.createChildContainer();
  authenticatorContainer.register<IStorage>("storage", {
    useValue: storage
  });
  return authenticatorContainer.resolve(AuthFetcher);
}
