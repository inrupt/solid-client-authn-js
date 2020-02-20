jest.mock("../../src/util/validateSchema");

// Required by TSyringe:
import "reflect-metadata";
import StorageRetriever from "../../src/util/StorageRetriever";

describe("StorageRetriever", () => {
  const mockStorage = {
    get: jest.fn(() => Promise.resolve('{"arbitrary": "json"}')),
    delete: jest.fn(() => Promise.resolve())
  };

  it("should correctly retrieve valid data from the given storage", async () => {
    mockStorage.get.mockReturnValueOnce(
      Promise.resolve(JSON.stringify({ some: "data" }))
    );
    const retriever = new StorageRetriever(mockStorage as any);

    await expect(retriever.retrieve("arbitrary key")).resolves.toEqual({
      some: "data"
    });
  });

  it("should fetch data using the given key", async () => {
    const retriever = new StorageRetriever(mockStorage as any);

    await retriever.retrieve("some key");

    expect(mockStorage.get.mock.calls).toEqual([["some key"]]);
  });

  it("should return null if data could not be found in the given storage", async () => {
    // @ts-ignore: Ignore because this mock function should be able to return null
    mockStorage.get.mockReturnValueOnce(Promise.resolve(null));
    const retriever = new StorageRetriever(mockStorage as any);

    const retrieved = await retriever.retrieve("arbitrary key");

    expect(retrieved).toBeNull();
  });

  it("should validate the data from the storage if passed a schema", async () => {
    const validateSchema: jest.Mock = jest.requireMock(
      "../../src/util/validateSchema"
    ).default;
    mockStorage.get.mockReturnValueOnce(
      Promise.resolve(JSON.stringify({ some: "data" }))
    );
    const retriever = new StorageRetriever(mockStorage as any);

    await retriever.retrieve("arbitrary key", { schema: { some: "schema" } });

    expect(validateSchema.mock.calls.length).toBe(1);
    expect(validateSchema.mock.calls[0][0]).toEqual({ some: "schema" });
    expect(validateSchema.mock.calls[0][1]).toEqual({ some: "data" });
  });

  it("should not validate the data from the storage if not passed a schema", async () => {
    const validateSchema: jest.Mock = jest.requireMock(
      "../../src/util/validateSchema"
    ).default;
    const retriever = new StorageRetriever(mockStorage as any);

    await retriever.retrieve("arbitrary key");

    expect(validateSchema.mock.calls.length).toBe(0);
  });

  it("should delete data from the storage if it does not pass validation", async () => {
    const validateSchema: jest.Mock = jest.requireMock(
      "../../src/util/validateSchema"
    ).default;
    validateSchema.mockImplementationOnce(() => {
      throw new Error("Arbitrary error");
    });
    const retriever = new StorageRetriever(mockStorage as any);

    const retrieved = await retriever.retrieve("some key", {
      schema: { arbitrary: "schema" }
    });

    expect(mockStorage.delete.mock.calls).toEqual([["some key"]]);
    expect(retrieved).toBeNull();
  });

  it("should run a postprocessor on the retrieved data if given", async () => {
    mockStorage.get.mockReturnValueOnce(
      Promise.resolve(JSON.stringify({ some: "data" }))
    );
    const retriever = new StorageRetriever(mockStorage as any);
    const postProcessor = jest.fn(() => "postprocessed data");

    const retrieved = await retriever.retrieve("arbitrary key", {
      postProcess: postProcessor
    });

    expect(postProcessor.mock.calls).toEqual([[{ some: "data" }]]);
    expect(retrieved).toBe("postprocessed data");
  });

  it("should not run a given postprocessor if the data could not be found", async () => {
    // @ts-ignore: Ignore because this mock function should be able to return null
    mockStorage.get.mockReturnValueOnce(Promise.resolve(null));
    const retriever = new StorageRetriever(mockStorage as any);
    const postProcessor = jest.fn();

    await retriever.retrieve("arbitrary key", { postProcess: postProcessor });

    expect(postProcessor.mock.calls).toEqual([]);
  });
});
