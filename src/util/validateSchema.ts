/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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
 * A wrapper function for AJV schema validation
 */
import Ajv from "ajv";
import URL from "url-parse";
import cloneDeep from "lodash.clonedeep";

export function compileTypeof(type: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data: any): boolean => {
    return typeof data === type; // eslint-disable-line valid-typeof
  };
}

export function compileJoinedStringOf(strings: string[]) {
  return (data: string): boolean => {
    return !data.split(" ").some(value => strings.indexOf(value) === -1);
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function traverseObject(
  data: any,
  schema: any,
  parent?: any,
  parentKey?: any
): void {
  if (schema.type === "object") {
    Object.keys(data).forEach((key: string) => {
      if (schema.properties && schema.properties[key]) {
        traverseObject(data[key], schema.properties[key], data, key);
      }
    });
  } else if (schema.type === "array") {
    data.forEach((item: any, index: number) => {
      if (schema.items) {
        traverseObject(item, schema.items, data, index);
      }
    });
  } else {
    // Set custom rules here
    // Convert to URL
    if (schema.shouldConvertToUrl && parent && parentKey) {
      parent[parentKey] = new URL(data);
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Validates a given item and given schema. Throws and error if invalid
 * @param schema The schema to validate against
 * @param item The item to validate
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function validateSchema(
  schema: { title?: string; [key: string]: any },
  inputItem: any
): any {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const item = cloneDeep(inputItem);
  const ajv = new Ajv();
  ajv.addKeyword("typeof", {
    compile: compileTypeof
  });
  ajv.addKeyword("joinedStringOf", {
    compile: compileJoinedStringOf
  });
  if (!ajv.validate(schema, item)) {
    let message = `${schema.title ? schema.title : "schema"} is invalid`;
    // istanbul ignore else: AJV's docs say this should always be set when validation fails,
    //                       so we cannot test it.
    if (ajv.errors) {
      message += ":";
      message += ajv.errors
        .map(err => `\n${err.dataPath} ${err.message}`)
        .toString();
    }
    throw new Error(message);
  }

  // If all is true, apply modifications
  traverseObject(item, schema);

  return item;
}
