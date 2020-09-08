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

import validateSchema from "../../src/util/validateSchema";

describe("validateSchema", () => {
  it("should return true if the given data matches the given schema", () => {
    const schema = {
      type: "object",
      properties: {
        foo: { type: "number" },
      },
    };

    expect(() => validateSchema(schema, { foo: 42 })).not.toThrow();
  });

  it("should not throw an error if the given data matches the given schema", () => {
    const schema = {
      type: "object",
      properties: {
        foo: { type: "number" },
      },
    };

    expect(() => validateSchema(schema, { foo: 42 })).not.toThrow();
  });

  it("should mark anything as valid when there is no schema to validate against", () => {
    expect(() => validateSchema({}, {})).not.toThrow();
  });

  it("should return false by default if the given data does not match the given schema", () => {
    const schema = {
      type: "object",
      properties: {
        foo: { type: "number" },
      },
    };

    expect(() => validateSchema(schema, { foo: "Not a number" })).toThrow();
  });

  it("should throw an error when told to if the given data does not match the given schema", () => {
    const schema = {
      type: "object",
      properties: {
        foo: { type: "number" },
      },
    };

    expect(() => validateSchema(schema, { foo: "Not a number" })).toThrowError(
      "schema is invalid:\n.foo should be number"
    );
  });

  it("should log the failing schema's title if known", () => {
    const schema = {
      title: "Some schema",
      type: "object",
      properties: {
        foo: { type: "number" },
      },
    };

    expect(() => validateSchema(schema, { foo: "Not a number" })).toThrowError(
      "Some schema is invalid:\n.foo should be number"
    );
  });

  describe("with our custom `typeof` keyword", () => {
    it("should properly validate if the given type matches the one mentioned in the schema", () => {
      const schema = {
        type: "object",
        properties: {
          foo: { typeof: "number" },
        },
      };

      expect(() => validateSchema(schema, { foo: 42 })).not.toThrow();
    });

    it("should not validate if the given type does not match the one mentioned in the schema", () => {
      const schema = {
        type: "object",
        properties: {
          foo: { typeof: "number" },
        },
      };

      expect(() => validateSchema(schema, { foo: "Not a number" })).toThrow();
    });
    it("should properly validate non-JSON types as well", () => {
      const schema = {
        type: "object",
        properties: {
          foo: { typeof: "function" },
        },
      };

      expect(() => validateSchema(schema, { foo: () => 1337 })).not.toThrow();
    });

    it("should not validate if the given type does not match a requested non-JSON type", () => {
      const schema = {
        type: "object",
        properties: {
          foo: { typeof: "function" },
        },
      };

      expect(() => validateSchema(schema, { foo: 42 })).toThrow();
    });

    it("should not validate if the given non-JSON type does not match the requested type", () => {
      const schema = {
        type: "object",
        properties: {
          foo: { typeof: "number" },
        },
      };

      expect(() =>
        validateSchema(schema, { foo: () => "A function" })
      ).toThrow();
    });
  });

  describe("with our custom `joinedStringOf` keyword", () => {
    it("should properly validate if the checked string consists of the words in the given array", () => {
      const schema = {
        type: "object",
        properties: {
          foo: {
            joinedStringOf: [
              "some",
              "words",
              "not",
              "necessarily",
              "in",
              "this",
              "order",
            ],
          },
        },
      };

      expect(() =>
        validateSchema(schema, {
          foo: "not necessarily some words in this order",
        })
      ).not.toThrow();
    });

    it("should not validate if the checked string includes more than the given words", () => {
      const schema = {
        type: "object",
        properties: {
          foo: {
            joinedStringOf: [
              "some",
              "words",
              "not",
              "necessarily",
              "in",
              "this",
              "order",
            ],
          },
        },
      };

      expect(() =>
        validateSchema(schema, {
          foo:
            "some words in this order but not necessarily with just those words ",
        })
      ).toThrow();
    });

    // This test fails (i.e. a subset of the given words validates); not sure yet if it should:
    it.skip("should not validate if the checked string includes not all the given words", () => {
      const schema = {
        type: "object",
        properties: {
          foo: {
            joinedStringOf: [
              "some",
              "words",
              "not",
              "necessarily",
              "in",
              "this",
              "order",
            ],
          },
        },
      };

      expect(validateSchema(schema, { foo: "some words" })).toThrow();
    });
  });

  describe("applying custom url conversion", () => {
    it("converts urls in a simple object", () => {
      const newObj = validateSchema(
        {
          type: "object",
          properties: {
            foo: { type: "string", shouldConvertToUrl: true },
          },
        },
        {
          foo: "https://cool.com/nice",
        }
      );
      expect(newObj.foo.origin).toBe("https://cool.com");
    });

    it("converts urls in a complex object", () => {
      const newObj = validateSchema(
        {
          type: "object",
          properties: {
            arr: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string", shouldConvertToUrl: true },
                },
              },
            },
          },
        },
        {
          arr: [
            { url: "https://cool.com/nice" },
            { url: "https://lame.com/mean" },
          ],
        }
      );
      expect(newObj.arr[0].url.origin).toBe("https://cool.com");
      expect(newObj.arr[1].url.origin).toBe("https://lame.com");
    });

    it("is not tripped up by weird schema traversal", () => {
      expect(() =>
        validateSchema(
          {
            type: "object",
            properties: {
              arr: {
                type: "array",
              },
              obj: {
                type: "object",
              },
            },
          },
          {
            arr: [1, "cool"],
            obj: {
              foo: "foo",
              bar: "bar",
            },
          }
        )
      ).not.toThrowError();
    });
  });
});
