/**
 * Copyright 2021 Inrupt Inc.
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

let authenticatedHeadersResolver = undefined;
self.onmessage = ({ data }) => {
  if (data.resource) {
    const resource = data.resource;
    const headersUnauthenticated = new Headers();
    headersUnauthenticated.set("Accept", "text/turtle");

    authenticateHeaders(resource, "get", headersUnauthenticated)
      .then((headers) => fetch(resource, { headers }))
      .then((response) => response.text())
      .catch((error) => self.postMessage({ text: error.message }))
      .then((text) => self.postMessage({ text }));
  } else if (data.headersRaw) {
    authenticatedHeadersResolver(new Headers(data.headersRaw));
  }
};

function authenticateHeaders(resource, method, headers) {
  const promise = new Promise((resolve) => {
    authenticatedHeadersResolver = resolve;
  });
  self.postMessage({ resource, method, headersRaw: [...headers.entries()] });
  return promise;
}
