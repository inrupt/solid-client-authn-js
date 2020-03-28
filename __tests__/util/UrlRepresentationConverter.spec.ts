import UrlRepresenationConverter from "../../src/util/UrlRepresenationConverter";

describe("UrlRepresentationConverter", () => {
  it("should convert to  url", () => {
    const represntationConverter = new UrlRepresenationConverter();
    expect(
      represntationConverter.requestInfoToUrl("https://coolsite.com/path")
        .origin
    ).toBe("https://coolsite.com");
  });
});
