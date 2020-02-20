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
      const mock: () => MockHandler = jest.fn<MockHandler, any[]>(() => ({
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
