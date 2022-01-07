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
