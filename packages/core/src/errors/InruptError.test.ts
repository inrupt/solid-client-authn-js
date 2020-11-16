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

/**
 * @hidden
 * @packageDocumentation
 */

import { jest, describe, it, expect } from "@jest/globals";

import { Response } from "cross-fetch";

import InruptError from "./InruptError";

describe("InruptError", () => {
  // it("wraps normal JavaScript error", () => {
  //   const error = new Error("Normal error...");
  //   error.name = "Some name";
  //
  //   const y = new InruptError(error, "Higher-level context");
  //   const z = new InruptError(y, "Even more Higher-level context");
  //   expect(new InruptError(error, "Higher-level context")).toEqual({});
  // });

  it("treats a message as a simple message", () => {
    const message = "Normal error string...";
    const error = new InruptError(message);

    expect(error.name).toEqual("Error");
    expect(error.toString()).toContain(message);
  });

  it("extracts Response details, but doesn't append details to message", () => {
    const failedResponse = new Response(undefined, {
      status: 404,
    }) as Response & { ok: false };

    const message = "Normal error string...";
    const error = new InruptError(message, failedResponse);

    expect(error.name).toEqual("Error");
    expect(error.toString()).not.toContain("404");
  });

  it("extracts Response details, and appends details to message", () => {
    const failedResponse = new Response(undefined, {
      status: 404,
    }) as Response & { ok: false };

    const message = "Normal error string...";
    const error = new InruptError(message, failedResponse, true);

    expect(error.name).toEqual("Error");
    expect(error.toString()).not.toContain("404");
  });
});
