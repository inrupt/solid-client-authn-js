/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

// Required by TSyringe:
import "reflect-metadata";
import BearerAuthenticatedFetcher from "../../../src/authenticatedFetch/bearer/BearerAuthenticatedFetcher";
import URL from "url-parse";

describe("BearerAuthenticatedFetcher", () => {
  describe("canHandle", () => {
    it("accepts configs with type bearer", async () => {
      const fetcher = new BearerAuthenticatedFetcher();

      expect(
        await fetcher.canHandle(
          { type: "bearer", localUserId: "global" },
          "http://example.com"
        )
      ).toBe(true);
    });

    it("rejects configs without type bearer", async () => {
      const fetcher = new BearerAuthenticatedFetcher();

      expect(
        await fetcher.canHandle(
          { type: "dpop", localUserId: "global" },
          "http://example.com"
        )
      ).toBe(false);
    });
  });
});
