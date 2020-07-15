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

import "reflect-metadata";
import AggregateHandler from "../../../src/util/handlerPattern/AggregateHandler";
import IHandleable from "../../../src/util/handlerPattern/IHandleable";

describe("AggregateHandler", () => {
  // Set up mock extension
  type MockHandler = IHandleable<[string], string>;
  class AggregateMockHandler extends AggregateHandler<[string], string>
    implements MockHandler {
    constructor(mockHandlers: MockHandler[]) {
      super(mockHandlers);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function initMocks(
    configs: { canHandle: boolean; executeTime: number; toReturn: string }[]
  ) {
    const mockHandlerInfo = configs.map(config => {
      const canHandleFunction: jest.Mock<Promise<boolean>, [string]> = jest.fn(
        async (input: string): Promise<boolean> => {
          return new Promise((resolve, reject) => {
            setTimeout(() => resolve(config.canHandle), config.executeTime);
          });
        }
      );
      const handleFunction: jest.Mock<Promise<string>, [string]> = jest.fn(
        async (input: string): Promise<string> => {
          return new Promise((resolve, reject) => {
            setTimeout(() => resolve(config.toReturn), config.executeTime);
          });
        }
      );
      const mock: () => MockHandler = jest.fn<MockHandler, unknown[]>(() => ({
        canHandle: canHandleFunction,
        handle: handleFunction
      }));
      return {
        canHandleFunction,
        handleFunction,
        mock
      };
    });
    const aggregateMockHandler = new AggregateMockHandler(
      mockHandlerInfo.map(info => info.mock())
    );
    return {
      mockHandlerInfo,
      aggregateMockHandler
    };
  }

  describe("canHandle", () => {
    it("should return correct handler", async () => {
      const mocks = initMocks([
        { canHandle: true, executeTime: 0, toReturn: "" },
        { canHandle: false, executeTime: 0, toReturn: "" }
      ]);
      const result = await mocks.aggregateMockHandler.canHandle("something");
      expect(result).toBe(true);
    });

    it("should error if there is no correct handler", async () => {
      const mocks = initMocks([
        { canHandle: false, executeTime: 0, toReturn: "" },
        { canHandle: false, executeTime: 0, toReturn: "" }
      ]);
      expect(await mocks.aggregateMockHandler.canHandle("something")).toBe(
        false
      );
    });
  });

  describe("handle", () => {
    it("should execute the handler", async () => {
      const mocks = initMocks([
        { canHandle: true, executeTime: 0, toReturn: "allGood" }
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
        { canHandle: false, executeTime: 0, toReturn: "" }
      ]);
      // For some reason the test didn't show up in coverage logs if I didn't do it like this
      try {
        await mocks.aggregateMockHandler.handle("something");
        expect(false).toBe(true);
      } catch (error) {
        expect(true).toBe(true);
      }
    });
  });
});
