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

import "reflect-metadata";
import IHandleable from "./IHandleable";
import AggregateHandler from "./AggregateHandler";

describe("AggregateHandler", () => {
  // Set up mock extension
  type MockHandler = IHandleable<[string], string>;
  class AggregateMockHandler
    extends AggregateHandler<[string], string>
    implements MockHandler {
    constructor(mockHandlers: MockHandler[]) {
      super(mockHandlers);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function initMocks(
    configs: { canHandle: boolean; executeTime: number; toReturn: string }[]
  ) {
    const mockHandlerInfo = configs.map((config) => {
      const canHandleFunction: jest.Mock<Promise<boolean>, [string]> = jest.fn(
        async (_input: string): Promise<boolean> => {
          return new Promise((resolve, _reject) => {
            setTimeout(() => resolve(config.canHandle), config.executeTime);
          });
        }
      );
      const handleFunction: jest.Mock<Promise<string>, [string]> = jest.fn(
        async (_input: string): Promise<string> => {
          return new Promise((resolve, _reject) => {
            setTimeout(() => resolve(config.toReturn), config.executeTime);
          });
        }
      );
      const mock: () => MockHandler = jest.fn<MockHandler, unknown[]>(() => ({
        canHandle: canHandleFunction,
        handle: handleFunction,
      }));
      return {
        canHandleFunction,
        handleFunction,
        mock,
      };
    });
    const aggregateMockHandler = new AggregateMockHandler(
      mockHandlerInfo.map((info) => info.mock())
    );
    return {
      mockHandlerInfo,
      aggregateMockHandler,
    };
  }

  describe("canHandle", () => {
    it("should return correct handler", async () => {
      const mocks = initMocks([
        { canHandle: true, executeTime: 0, toReturn: "" },
        { canHandle: false, executeTime: 0, toReturn: "" },
      ]);
      const result = await mocks.aggregateMockHandler.canHandle("something");
      expect(result).toBe(true);
    });

    it("should error if there is no correct handler", async () => {
      const mocks = initMocks([
        { canHandle: false, executeTime: 0, toReturn: "" },
        { canHandle: false, executeTime: 0, toReturn: "" },
      ]);
      expect(await mocks.aggregateMockHandler.canHandle("something")).toBe(
        false
      );
    });
  });

  describe("handle", () => {
    it("should execute the handler", async () => {
      const mocks = initMocks([
        { canHandle: true, executeTime: 0, toReturn: "allGood" },
      ]);
      const result = await mocks.aggregateMockHandler.handle("something");
      expect(result).toBe("allGood");
    });

    it.skip("should run the correct handler even when it is preceded by the incorrect handler", () => {
      // TODO: complete
    });

    it.skip("should run the first correct handler even when succeeded by a handler that takes a shorter time to execute", () => {
      // TODO: complete
    });

    it("should error when there is no correct handler", async () => {
      const mocks = initMocks([
        { canHandle: false, executeTime: 0, toReturn: "" },
        { canHandle: false, executeTime: 0, toReturn: "" },
      ]);
      await expect(() =>
        mocks.aggregateMockHandler.handle("something")
      ).rejects.toThrow();
    });

    it("should error when there is no correct handler, and handle invalid JSON", async () => {
      const mocks = initMocks([
        { canHandle: false, executeTime: 0, toReturn: "" },
        { canHandle: false, executeTime: 0, toReturn: "" },
      ]);

      // Cyclical object that references itself causes JSON.stringify to throw!
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = {
        prop: {},
      };
      obj.prop = obj;

      await expect(() =>
        mocks.aggregateMockHandler.handle(obj)
      ).rejects.toThrow();
    });
  });
});
