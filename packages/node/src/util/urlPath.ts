/*
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

import { URL } from "url";

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Utility that appends the specified value to end of the specified URL's path.
 * Note: if we are passed an invalid URL we return a more helpful error that
 * tells us both input values, and that we were attempting an append operation.
 *
 * @param url  the URL to whose path we append the specified value
 * @param append  the value to append to the URL's path
 */
export function appendToUrlPathname(url: string, append: string): string {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    parsedUrl.pathname = `${path}${path.endsWith("/") ? "" : "/"}${
      append.startsWith("/") ? append.substring(1) : append
    }`;

    return parsedUrl.toString();
  } catch (error) {
    throw new Error(
      `Failed to append [${append}] to the URL path of [${url}]. Error: ${error}`
    );
  }
}
