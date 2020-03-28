import NodeStorage from "../../src/localStorage/NodeStorage";

describe("NodeStorage", () => {
  const nodeStorage = new NodeStorage();
  it("can set an item", async () => {
    expect(nodeStorage.set("a", "A")).rejects.not.toBeNull();
  });
  it("can get an item", async () => {
    expect(await nodeStorage.get("a")).toEqual("A");
  });
  it("returns undefined if the key does not exist", async () => {
    expect(await nodeStorage.get("doesNotExist")).toBeNull();
  });
  it("can delete an item", async () => {
    await nodeStorage.delete("a");
    expect(await nodeStorage.get("a")).toBeNull();
  });
});
