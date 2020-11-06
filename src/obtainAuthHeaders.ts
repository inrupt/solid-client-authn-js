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

import { customAuthFetcher } from "./index";
import fetch from "node-fetch";
import AuthFetcher from "./AuthFetcher";

export async function getAuthFetcher(
  oidcIssuer: string,
  oidcProviderCookie: string,
  appOrigin: string,
  allowUnauthenticated = true
): Promise<AuthFetcher | { fetch: any }> {
  if (!oidcProviderCookie.length && allowUnauthenticated) {
    return { fetch };
  }
  const authFetcher = await customAuthFetcher();

  const session = await authFetcher.login({
    oidcIssuer,
    redirect: appOrigin
  });
  let redirectedTo = (session.neededAction as any).redirectUrl;
  do {
    const result = await fetch(redirectedTo, {
      headers: { cookie: oidcProviderCookie },
      redirect: "manual"
    });
    redirectedTo = result.headers.get("location");
    if (redirectedTo === null) {
      throw new Error(
        `Please make sure the cookie is valid, and add "${appOrigin}" as a trusted app!`
      );
    }
  } while (!redirectedTo?.startsWith(appOrigin));

  await authFetcher.handleRedirect(redirectedTo);
  return authFetcher;
}

export async function getNodeSolidServerCookie(
  serverRoot: string,
  username: string,
  password: string
): Promise<string | null> {
  const authFetcher = await customAuthFetcher();
  const serverLoginResult = await authFetcher.fetch(
    `${serverRoot}/login/password`,
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: `username=${username}&password=${password}`,
      method: "POST",
      redirect: "manual"
    }
  );
  return serverLoginResult.headers.get("set-cookie");
}

export async function getPhpSolidServerCookie(
  serverRoot: string,
  username: string,
  password: string
): Promise<string | null> {
  const authFetcher = await customAuthFetcher();
  const serverLoginResult = await authFetcher.fetch(`${serverRoot}/login`, {
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: `username=${username}&password=${password}`,
    method: "POST",
    redirect: "manual"
  });
  return serverLoginResult.headers.get("set-cookie");
}

// FIXME: This is a total hack, obviously, second-guessing the
// DI architecture of solid-auth-fetcher:
export async function getAuthHeaders(
  urlStr: string,
  method: string,
  authFetcher: AuthFetcher
): Promise<{ Authorization: string; DPop: string }> {
  return {
    Authorization: JSON.parse(
      (authFetcher as any).authenticatedFetcher.tokenRefresher.storageUtility
        .storage.map["solidAuthFetcherUser:global"]
    ).accessToken,
    DPop: await (authFetcher as any).authenticatedFetcher.tokenRefresher.tokenRequester.dpopHeaderCreator.createHeaderToken(
      new URL(urlStr),
      method
    )
  };
}
