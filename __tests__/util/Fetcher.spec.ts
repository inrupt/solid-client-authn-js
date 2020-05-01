/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import Fetcher from "../../src/util/Fetcher";
import URL from "url-parse";

jest.mock("cross-fetch");

describe("UuidGenerator", () => {
  it("should make a fetch given a string", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockReturnValueOnce(Promise.resolve("some response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch("https://someurl.com")).toBe("some response");
  });

  it("should make a fetch given a URL", async () => {
    const fetch = jest.requireMock("cross-fetch");
    fetch.mockReturnValueOnce(Promise.resolve("some response"));

    const fetcher = new Fetcher();
    expect(await fetcher.fetch(new URL("https://someurl.com"))).toBe(
      "some response"
    );
  });
});
