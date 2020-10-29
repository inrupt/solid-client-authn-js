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

import {
  getAuthFetcher,
  getAuthHeaders,
  getNodeSolidServerCookie
} from "solid-auth-fetcher";
import fetch, { Response } from "node-fetch";

async function run(): Promise<void> {
  const serverRoot = "https://localhost:8443";
  const username = "alice";
  const password = "123";
  const appOrigin = "https://mysite.com";
  const privateResource = "https://localhost:8443/private/";
  console.log(
    `\n\nMake sure node-solid-server is running on https://localhost:8443, with single user '${username}' / '${password}' and ${appOrigin} as a trusted app.\n\n\n`
  );
  const cookie = await getNodeSolidServerCookie(serverRoot, username, password);
  if (!cookie) {
    throw new Error("Could not log in");
  }
  const fetcher = await getAuthFetcher(serverRoot, cookie, appOrigin);
  const result = await fetcher.fetch(privateResource);
  // You could use getAuthHeaders to subscribe to the WebSocket, see
  // https://github.com/solid/specification/issues/52#issuecomment-682491952
  //
  // const updatesVia = result.headers.get('Updates-Via');
  // if (updatesVia) {
  //   const authHeaders = getAuthHeaders(fetcher);
  //   const ws = new WebSocket(updatesVia);
  //   ws.on('connect', () => {
  //     ws.write(`auth ${authHeaders.Authorization}`);
  //     ws.write(`dpop ${authHeaders.DPop}`);
  //     ws.write(`sub ${privateResource}`);
  //   }
  // }
  console.log(result.status);
  console.log(await result.text());
}
run();
