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
      message: "Bad Config"
    },
    {
      name: "HandlerNotFoundError",
      class: HandlerNotFoundError,
      params: ["HandlerName", [1, 2]],
      message: "HandlerName cannot find a suitable handler for: 1, 2"
    },
    {
      name: "NotImplementedError",
      class: NotImplementedError,
      params: ["FunctionName"],
      message: "FunctionName is not implemented"
    }
  ];

  errors.forEach(err => {
    it(`Should throw ${err.name}`, () => {
      expect(() => {
        const error = new err.class(...err.params);
        throw error;
      }).toThrowError(err.message);
    });
  });
});
