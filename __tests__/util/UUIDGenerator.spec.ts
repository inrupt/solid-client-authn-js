/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import UuidGenerator from "../../src/util/UuidGenerator";

jest.mock("uuid");

describe("UuidGenerator", () => {
  it("should simply wrap the `uuid` module", () => {
    const uuidMock: { v4: jest.Mock } = jest.requireMock("uuid");
    uuidMock.v4.mockReturnValueOnce("some uuid");

    const generator = new UuidGenerator();
    expect(generator.v4()).toBe("some uuid");
  });
});
