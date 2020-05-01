/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

// Consider redoing this file as it contains code outside of the dependency injection framework
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
  options: ILoginInputOptions
): Promise<ISolidSession> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.login(options);
}

export async function fetch(
  url: RequestInfo,
  init: RequestInit
): Promise<Response> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.fetch(url, init);
}

export async function logout(): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.logout();
}

export async function getSession(): Promise<ISolidSession | null> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.getSession();
}

export async function uniqueLogin(
  options: ILoginInputOptions
): Promise<ISolidSession> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.uniqueLogin(options);
}

export async function onSession(
  callback: (session: ISolidSession) => unknown
): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.onSession(callback);
}

export async function onLogout(
  callback: (session: ISolidSession) => unknown
): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.onLogout(callback);
}

export async function onRequest(
  callback: (url: RequestInfo, requestInit: RequestInit) => unknown
): Promise<void> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.onRequest(callback);
}

export async function handleRedirect(url: string): Promise<ISolidSession> {
  const authFetcher = await getGlobalAuthFetcher();
  return authFetcher.handleRedirect(url);
}
