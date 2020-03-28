import Fetcher from "../../src/util/Fetcher";
import URL from "url-parse";

jest.mock("isomorphic-fetch");

describe("UuidGenerator", () => {
  it("should make a fetch given a string", async () => {
    const fetch = jest.requireMock("isomorphic-fetch");
    fetch.mockReturnValueOnce(Promise.resolve("some response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch("https://someurl.com")).toBe("some response");
  });

  it("should make a fetch given a URL", async () => {
    const fetch = jest.requireMock("isomorphic-fetch");
    fetch.mockReturnValueOnce(Promise.resolve("some response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch(new URL("https://someurl.com"))).toBe(
      "some response"
    );
  });
});
