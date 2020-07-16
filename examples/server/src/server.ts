import { customAuthFetcher } from "solid-auth-fetcher";
import fetch, { Response } from "node-fetch";

async function getNodeSolidServerCookie(serverRoot: string, username: string, password: string) {
  const authFetcher = await customAuthFetcher();
  const serverLoginResult = await authFetcher.fetch(`${serverRoot}/login/password`, {
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: `username=${username}&password=${password}`,
    method: "POST",
    redirect: "manual"
  });
  return serverLoginResult.headers.get('set-cookie');
}

async function authenticatedFetch(serverRoot: string, cookie: string, url: string) {
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
  } while(!redirectedTo?.startsWith(appRedirectUrl));

  await authFetcher.handleRedirect(redirectedTo);
  return authFetcher.fetch(url);
}

async function run() {
  const serverRoot = "https://localhost:8443";
  const username = "alice";
  const password = "123";
  const privateResource = "https://localhost:8443/private/";
  console.log("\n\nMake sure node-solid-server is running on https://localhost:8443, with single user 'alice' / '123'\n\n\n");
  const cookie = await getNodeSolidServerCookie(serverRoot, username, password);
  const result = await authenticatedFetch(serverRoot, cookie, privateResource);
  console.log(result.status);
  console.log(await result.text());
}
run();
