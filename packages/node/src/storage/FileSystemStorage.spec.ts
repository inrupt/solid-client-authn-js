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

import { it, describe } from "@jest/globals";
import FileSystemStorage, { get } from "./FileSystemStorage";

jest.mock("fs");

describe("get", () => {
  it("retrieves an element from a JSON file", async () => {
    const data = { someKey: "some value" };
    const mockedFs = jest.requireMock("fs");
    mockedFs.promises = {
      readFile: jest.fn().mockResolvedValue(JSON.stringify(data)),
    };
    await expect(get("some file", "someKey")).resolves.toEqual("some value");
  });

  it("returns undefined if the key isn't present in storage", async () => {
    const data = { someKey: "some value" };
    const mockedFs = jest.requireMock("fs");
    mockedFs.promises = {
      readFile: jest.fn().mockResolvedValue(JSON.stringify(data)),
    };
    await expect(get("some file", "someOtherKey")).resolves.toBeUndefined();
  });

  it("throws on file system error", async () => {
    const mockedFs = jest.requireMock("fs");
    mockedFs.promises = {
      readFile: () => {
        throw new Error("Some file system error");
      },
    };
    await expect(get("some file", "someKey")).rejects.toThrow(
      "An error happened while parsing JSON content of [some file]: Error: Some file system error"
    );
  });

  it("throws if the file isn't JSON", async () => {
    const mockedFs = jest.requireMock("fs");
    mockedFs.promises = {
      readFile: jest.fn().mockResolvedValue("Something that isn't JSON"),
    };
    await expect(get("some file", "someKey")).rejects.toThrow(
      "An error happened while parsing JSON content of [some file]: SyntaxError:"
    );
  });
});

describe("FileSystemStorage", () => {
  it("creates a file if the given path does not resolve", () => {
    const mockedFs = jest.requireMock("fs");
    mockedFs.existsSync = jest.fn().mockReturnValueOnce(false);
    const mockedFileCreation = jest.spyOn(mockedFs, "writeFileSync");
    // ESLint prevents from using new for side-effect, which we want to
    // do here for test purpose.
    // eslint-disable-next-line no-new
    new FileSystemStorage("some file");
    expect(mockedFileCreation).toHaveBeenCalled();
  });

  it("does not overwrite an existing file", () => {
    const mockedFs = jest.requireMock("fs");
    mockedFs.existsSync = jest.fn().mockReturnValueOnce(true);
    const mockedFileCreation = jest.spyOn(mockedFs, "writeFileSync");
    // ESLint prevents from using new for side-effect, which we want to
    // do here for test purpose.
    // eslint-disable-next-line no-new
    new FileSystemStorage("some file");
    expect(mockedFileCreation).not.toHaveBeenCalled();
  });

  it("does not implement set yet", async () => {
    const mockedFs = jest.requireMock("fs");
    mockedFs.existsSync = jest.fn().mockReturnValueOnce(true);
    const store = new FileSystemStorage("some file");
    await expect(store.set("someKey", "some value")).rejects.toThrow(
      "not implemented"
    );
  });

  it("does not implement delete yet", async () => {
    const mockedFs = jest.requireMock("fs");
    mockedFs.existsSync = jest.fn().mockReturnValueOnce(true);
    const store = new FileSystemStorage("some file");
    await expect(store.delete("someKey")).rejects.toThrow("not implemented");
  });
});
