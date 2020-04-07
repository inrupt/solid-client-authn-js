import ISolidSession from "./solidSession/ISolidSession";
import ILoginInputOptions from "./ILoginInputOptions";
import AuthFetcher from "./AuthFetcher";
import getAuthFetcherWithDependencies from "./dependencies";
import IStorage from "./localStorage/IStorage";

export interface ICustomAuthFetcherOptions {
  storage?: IStorage;
  doNotAutoHandleRedirect?: boolean;
}

let redirectHandlerPromise: Promise<void>;
let redirectHandlerPromiseIsResolved = false;
export async function customAuthFetcher(
  options?: ICustomAuthFetcherOptions
): Promise<AuthFetcher> {
  const authFetcher = getAuthFetcherWithDependencies({
    storage: options?.storage
  });
  if (!options?.doNotAutoHandleRedirect) {
    if (!redirectHandlerPromise) {
      redirectHandlerPromise = authFetcher.automaticallyHandleRedirect();
      await redirectHandlerPromise;
      redirectHandlerPromiseIsResolved = true;
    } else if (!redirectHandlerPromiseIsResolved) {
      await redirectHandlerPromise;
    }
  }
  return authFetcher;
}

let globalAuthFetcher: AuthFetcher;
async function getGlobalAuthFetcher(
  options?: ICustomAuthFetcherOptions
): Promise<AuthFetcher> {
  if (globalAuthFetcher) {
    return globalAuthFetcher;
  }
  globalAuthFetcher = await customAuthFetcher(options);
  return globalAuthFetcher;
}

export async function login(
  options: ILoginInputOptions,
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<ISolidSession> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.login(options);
}

export async function fetch(
  url: RequestInfo,
  init: RequestInit,
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<Response> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.fetch(url, init);
}

export async function logout(
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.logout();
}

export async function getSession(
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<ISolidSession | null> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.getSession();
}

export async function uniqueLogin(
  options: ILoginInputOptions,
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<ISolidSession> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.uniqueLogin(options);
}

export async function onSession(
  callback: (session: ISolidSession) => unknown,
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.onSession(callback);
}

export async function onLogout(
  callback: (session: ISolidSession) => unknown,
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.onLogout(callback);
}

export async function handleRedirect(
  url: string,
  authFetcherOptions?: ICustomAuthFetcherOptions
): Promise<ISolidSession> {
  const authFetcher = await getGlobalAuthFetcher(authFetcherOptions);
  return authFetcher.handleRedirect(url);
}
