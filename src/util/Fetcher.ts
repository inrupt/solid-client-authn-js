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

/**
 * A wrapper method to wrap the standard w3 fetch library
 */
import URL from "url-parse";
import _fetch from "cross-fetch";
import Debug from "debug";

const debug = Debug("SolidAuthFetcher");
debug("Ready to roll");

export interface IFetcher {
  fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export default class Fetcher implements IFetcher {
  async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const fetchUrl = url instanceof URL ? url.toString() : url;
    const options = [];
    if (init) {
      if (init.method) {
        options.push(`-X '${init.method}'`);
      }
      if (init.body) {
        options.push(
          `-d '${
            init.body.toString().length > 1000
              ? init.body.toString().substring(0, 100) + "..."
              : init.body
          }'`
        );
      }
      if (init.headers) {
        if (Array.isArray(init.headers)) {
          (init.headers as string[][]).forEach(pair => {
            options.push(`-H '${pair[0]}: ${pair[1]}'`);
          });
          // } else if (init.headers instanceof Headers) {
          //   init.headers.forEach(pair => {
          //     options.push(`-H '${pair[0]}: ${pair[1]}'`);
          //   });
        } else {
          Object.keys(init.headers as any).forEach(key => {
            options.push(`-H '${key}: ${(init.headers as any)[key]}'`);
          });
        }
      }
    }
    debug(`curl -v ${options.join(" ")} ${url}`);
    if (typeof window !== "undefined" && typeof window.fetch !== "undefined") {
      return window.fetch(fetchUrl, init);
    }
    return _fetch(fetchUrl, init);
  }
}
