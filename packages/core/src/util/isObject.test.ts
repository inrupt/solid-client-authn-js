/*
 * Copyright 2022 Inrupt Inc.
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

import { describe, it, expect } from "@jest/globals";
import { isObject } from "./isObject";

/**
 * These test cases are largely based on those from lodash, adapted to use
 * jest and also have Arrays return false, instead of true:
 */

function toArgs(array: unknown[]) {
  return function () {
    return arguments;
  }.apply(undefined, array as []);
}

const args = toArgs([1, 2, 3]);
const symbol = Symbol ? Symbol("a") : undefined;
const slice = Array.prototype.slice;

describe("isObject", function () {
  it("should return `true` for objects", function () {
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject(args)).toBe(true);
    expect(isObject(Object(false))).toBe(true);
    expect(isObject(new Date())).toBe(true);
    expect(isObject(new Error())).toBe(true);

    expect(isObject(Object(0))).toBe(true);
    expect(isObject(/x/)).toBe(true);
    expect(isObject(Object("a"))).toBe(true);
    expect(isObject(Object(symbol))).toBe(true);
  });

  it("should return `false` for non-objects", function () {
    var falsey = [, null, undefined, false, 0, NaN, ""];
    var truthy = [true, 1, "a", symbol];

    var values = [...falsey, ...truthy];

    const expected = values.map(() => false);
    const actual = values.map((v) => isObject(v));

    expect(actual).toStrictEqual(expected);

    // Our implementation differs from lodash as we explicitly don't want Array to be classified as objects:
    expect(isObject([1, 2, 3])).toBe(false);
    expect(isObject(slice)).toBe(false);
  });
});
