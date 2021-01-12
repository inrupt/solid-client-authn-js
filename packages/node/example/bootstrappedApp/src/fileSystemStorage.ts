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

/**
 * @hidden
 * @packageDocumentation
 */

import { IStorage } from "@inrupt/solid-client-authn-core";
// Note that currently, the jest runner doesn't support ES modules, so the following
// does not work, and the "promise" import on the line after that is required instead.
// import { readFile } from "fs/promises";
import { existsSync, writeFileSync, readFileSync, promises } from "fs";

/**
 * Simple persistent storage solution that uses a file on the host filesystem to store data
 * @hidden
 */
export class FileSystemStorage implements IStorage {
  private map: Record<string, string> = {};

  constructor(private path: string) {
    // If the file does not exist, create it
    if (!existsSync(path)) {
      writeFileSync(path, "{}", {
        encoding: "utf-8",
      });
    }
    try {
      this.map = JSON.parse(
        readFileSync(path, {
          encoding: "utf-8",
        })
      );
    } catch (e) {
      throw new Error(
        `An error happened while parsing JSON content of [${path}]: ${e}`
      );
    }
  }

  get = async (key: string): Promise<string | undefined> =>
    this.map[key] || undefined;

  set = async (key: string, value: string): Promise<void> => {
    this.map[key] = value;
    return promises.writeFile(this.path, JSON.stringify(this.map, null, "  "), {
      encoding: "utf-8",
    });
  };

  delete = async (key: string): Promise<void> => {
    delete this.map[key];
    return promises.writeFile(this.path, JSON.stringify(this.map, null, "  "), {
      encoding: "utf-8",
    });
  };
}
