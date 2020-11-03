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

import { OidcClient, WebStorageStateStore } from "oidc-client";

/**
 * Removes OIDC-specific query parameters from a given URL (state, code...)
 * @param redirectUrl The URL to clean up.
 * @returns A copy of the URL, without OIDC-specific query params.
 */
export function removeOidcQueryParam(redirectUrl: string): string {
  const cleanedUrl = new URL(redirectUrl);
  cleanedUrl.searchParams.delete("code");
  cleanedUrl.searchParams.delete("state");
  return cleanedUrl.toString();
}

/**
 * Clears any OIDC-related data lingering in the local storage.
 */
export async function clearOidcPersistentStorage(): Promise<void> {
  const client = new OidcClient({
    // TODO: We should look at the various interfaces being used for storage,
    //  i.e. between oidc-client-js (WebStorageStoreState), localStorage
    //  (which has an interface Storage), and our own proprietary interface
    //  IStorage - i.e. we should really just be using the browser Web Storage
    //  API, e.g. "stateStore: window.localStorage,".
    // We are instantiating a new instance here, so the only value we need to
    // explicitly provide is the response mode (default otherwise will look
    // for a hash '#' fragment!).
    // eslint-disable-next-line camelcase
    response_mode: "query",
  });
  await client.clearStaleState(new WebStorageStateStore({}));
  const myStorage = window.localStorage;
  const itemsToRemove = [];
  for (let i = 0; i <= myStorage.length; i++) {
    const key = myStorage.key(i);
    if (
      key &&
      (key.match(/^oidc\..+$/) ||
        key.match(/^solidClientAuthenticationUser:.+$/))
    ) {
      itemsToRemove.push(key);
    }
  }
  itemsToRemove.forEach((key) => myStorage.removeItem(key));
}
