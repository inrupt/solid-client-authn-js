/**
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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * A wrapper method to wrap the standard w3 fetch library
 */
import URL from "url-parse";
import _fetch from "cross-fetch";

export interface IFetcher {
  fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/**
 * @hidden
 */
export default class Fetcher implements IFetcher {
  async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const fetchUrl = url instanceof URL ? url.toString() : url;
    if (typeof window !== "undefined" && typeof window.fetch !== "undefined") {
      return window.fetch(fetchUrl, init);
    }
    return _fetch(fetchUrl, init);
  }
}
