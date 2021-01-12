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

import { it, describe } from "@jest/globals";
import { FileSystemStorage } from "./FileSystemStorage";

jest.mock("fs");

describe("FileSystemStorage", () => {
  describe("constructor", () => {
    it("throws on file system error", async () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.readFileSync = () => {
        throw new Error("Some file system error");
      };
      expect(() => new FileSystemStorage("some/path")).toThrow(
        "An error happened while parsing JSON content of [some/path]: Error: Some file system error"
      );
    });

    it("throws if the file isn't JSON", async () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.readFileSync = jest
        .fn()
        .mockResolvedValue("Something that isn't JSON");
      expect(() => new FileSystemStorage("some file")).toThrow(
        "An error happened while parsing JSON content of [some file]: SyntaxError:"
      );
    });

    it("creates a file if the given path does not resolve", () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValueOnce(false);
      mockedFs.readFileSync = jest.fn().mockReturnValue("{}");
      mockedFs.writeFileSync = jest.fn();
      // ESLint prevents from using new for side-effect, which we want to
      // do here for test purpose.
      // eslint-disable-next-line no-new
      new FileSystemStorage("some file");
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it("does not overwrite an existing file", () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValueOnce(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue("{}");
      mockedFs.writeFileSync = jest.fn();
      // ESLint prevents from using new for side-effect, which we want to
      // do here for test purpose.
      // eslint-disable-next-line no-new
      new FileSystemStorage("some file");
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("retrieves an element from a JSON file", async () => {
      const data = { someKey: "some value" };
      const mockedFs = jest.requireMock("fs");
      mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(data));
      const storage = new FileSystemStorage("some/path");
      await expect(storage.get("someKey")).resolves.toEqual("some value");
    });

    it("returns undefined if the key isn't present in storage", async () => {
      const data = { someKey: "some value" };
      const mockedFs = jest.requireMock("fs");
      mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(data));
      const storage = new FileSystemStorage("some/path");
      await expect(storage.get("someOtherKey")).resolves.toBeUndefined();
    });
  });

  describe("set", () => {
    it("sets a value for a new key", async () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue("{}");
      mockedFs.promises = {
        writeFile: jest.fn(),
      };
      const storage = new FileSystemStorage("some/path");
      await storage.set("someKey", "some value");
      await expect(storage.get("someKey")).resolves.toEqual("some value");
    });

    it("overwrites an existing value", async () => {
      const data = { someKey: "some old value" };
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(data));
      mockedFs.promises = {
        writeFile: jest.fn(),
      };
      const storage = new FileSystemStorage("some/path");
      await storage.set("someKey", "some new value");
      await expect(storage.get("someKey")).resolves.toEqual("some new value");
    });

    it("persists the new value on disk", async () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue("{}");
      mockedFs.promises = {
        writeFile: jest.fn(),
      };
      const storage = new FileSystemStorage("some/path");
      await storage.set("someKey", "some value");
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        "some/path",
        JSON.stringify({ someKey: "some value" })
      );
    });

    it("throws in case of write error", async () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue("{}");
      mockedFs.promises = {
        writeFile: () => {
          throw new Error("Some write error");
        },
      };
      const storage = new FileSystemStorage("some/path");
      await expect(storage.set("someKey", "some value")).rejects.toThrow(
        "Some write error"
      );
    });
  });

  describe("delete", () => {
    it("deletes the value for the provided key from storage", async () => {
      const data = { someKey: "some old value" };
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(data));
      mockedFs.promises = {
        writeFile: jest.fn(),
      };
      const storage = new FileSystemStorage("some/path");
      await storage.delete("someKey");
      await expect(storage.get("someKey")).resolves.toBeUndefined();
    });

    it("does not delete the value for another key", async () => {
      const data = { someKey: "some old value" };
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(data));
      mockedFs.promises = {
        writeFile: jest.fn(),
      };
      const storage = new FileSystemStorage("some/path");
      await storage.delete("someOtherKey");
      await expect(storage.get("someKey")).resolves.toEqual("some old value");
    });

    it("persists the updated file on disk", async () => {
      const data = { someKey: "some old value" };
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(data));
      mockedFs.promises = {
        writeFile: jest.fn(),
      };
      const storage = new FileSystemStorage("some/path");
      await storage.delete("someKey");
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        "some/path",
        "{}"
      );
    });

    it("throws in case of write error", async () => {
      const mockedFs = jest.requireMock("fs");
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.readFileSync = jest.fn().mockReturnValue("{}");
      mockedFs.promises = {
        writeFile: () => {
          throw new Error("Some write error");
        },
      };
      const storage = new FileSystemStorage("some/path");
      await expect(storage.delete("someKey")).rejects.toThrow(
        "Some write error"
      );
    });
  });
});
