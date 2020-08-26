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
 * Test for all custom errors
 */
import ConfigurationError from "../../src/errors/ConfigurationError";
import HandlerNotFoundError from "../../src/errors/HandlerNotFoundError";
import NotImplementedError from "../../src/errors/NotImplementedError";

describe("errors", () => {
  const errors: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    class: any;
    params: unknown[];
    message: string;
  }[] = [
    {
      name: "ConfigurationError",
      class: ConfigurationError,
      params: ["Bad Config"],
      message: "Bad Config",
    },
    {
      name: "HandlerNotFoundError",
      class: HandlerNotFoundError,
      params: ["HandlerName", [1, 2]],
      message: "[HandlerName] cannot find a suitable handler for: 1, 2",
    },
    {
      name: "NotImplementedError",
      class: NotImplementedError,
      params: ["FunctionName"],
      message: "[FunctionName] is not implemented",
    },
  ];

  errors.forEach((err) => {
    it(`Should throw [${err.name}]`, () => {
      expect(() => {
        const error = new err.class(...err.params);
        throw error;
      }).toThrowError(err.message);
    });
  });
});
