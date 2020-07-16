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

import { customAuthFetcher } from "solid-auth-fetcher";
import fetch, { Response } from "node-fetch";

async function getNodeSolidServerCookie(
  serverRoot: string,
  username: string,
  password: string
): Promise<string> {
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

async function authenticatedFetch(
  serverRoot: string,
  cookie: string,
  url: string
): Promise<Response> {
  const authFetcher = await customAuthFetcher();
  const appRedirectUrl = "https://mysite.com/";
  const session = await authFetcher.login({
    oidcIssuer: serverRoot,
    redirect: appRedirectUrl
  });
  let redirectedTo = (session.neededAction as any).redirectUrl;
  do {
    const result = await fetch(redirectedTo, {
      headers: {
        cookie
      },
      redirect: "manual"
    });
    redirectedTo = result.headers.get("location");
    console.log("Redirected to", redirectedTo);
  } while (!redirectedTo?.startsWith(appRedirectUrl));

  await authFetcher.handleRedirect(redirectedTo);
  return authFetcher.fetch(url);
}

async function run(): Promise<void> {
  const serverRoot = "https://localhost:8443";
  const username = "alice";
  const password = "123";
  const privateResource = "https://localhost:8443/private/";
  console.log(
    "\n\nMake sure node-solid-server is running on https://localhost:8443, with single user 'alice' / '123'\n\n\n"
  );
  const cookie = await getNodeSolidServerCookie(serverRoot, username, password);
  const result = await authenticatedFetch(serverRoot, cookie, privateResource);
  console.log(result.status);
  console.log(await result.text());
}
run();
