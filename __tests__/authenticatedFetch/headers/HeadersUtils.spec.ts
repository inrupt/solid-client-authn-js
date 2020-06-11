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

import { flattenHeaders } from "../../../src/authenticatedFetch/headers/HeadersUtils";
import { Headers as NodeHeaders } from "node-fetch";

describe("Headers interoperability function", () => {
  it("transforms an incoming Headers object into a flat headers structure", () => {
    const myHeaders = new NodeHeaders();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "text/turtle");
    // The following needs to be ignored because `node-fetch::Headers` and
    // `lib.dom.d.ts::Headers` don't align. It doesn't break the way we
    // use them currently, but it's something that must be cleaned up
    // at some point.
    // eslint-disable-next-line
    // @ts-ignore
    const flatHeaders = flattenHeaders(myHeaders);
    expect(Object.entries(flatHeaders)).toEqual([
      ["accept", "application/json"],
      ["content-type", "text/turtle"]
    ]);
  });

  it("supports non-iterable headers if they provide a reasonably standard way of browsing them", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myHeaders: any = {};
    myHeaders["forEach"] = (
      callback: (value: string, key: string) => void
    ): void => {
      callback("application/json", "accept");
      callback("text/turtle", "content-type");
    };
    const flatHeaders = flattenHeaders(myHeaders);
    expect(Object.entries(flatHeaders)).toEqual([
      ["accept", "application/json"],
      ["content-type", "text/turtle"]
    ]);
  });
});
