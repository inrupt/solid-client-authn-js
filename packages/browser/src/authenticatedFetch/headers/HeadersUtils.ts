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
 * @hidden
 * This function feels unnecessarily complicated, but is required in order to
 * have Headers according to type definitions in both Node and browser environments.
 * This might require a fix upstream to be cleaned up.
 *
 * @param headersToFlatten A structure containing headers potentially in several formats
 */
export function flattenHeaders(
  headersToFlatten: Headers | Record<string, string> | string[][] | undefined
): Record<string, string> {
  if (typeof headersToFlatten === "undefined") {
    return {};
  }
  const flatHeaders: Record<string, string> = {};

  // If the headers are already a Record<string, string>,
  // they can directly be returned.
  if (typeof headersToFlatten.forEach !== "function") {
    // FIXME: This will break when passed a string[][]
    //        (as shown when the type assertions are removed).
    return headersToFlatten as Record<string, string>;
  }

  (headersToFlatten as Headers).forEach((value: string, key: string) => {
    flatHeaders[key] = value;
  });
  return flatHeaders;
}
