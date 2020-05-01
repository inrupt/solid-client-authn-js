/** @jest-environment node */ /* eslint-disable-line */
// The @jest-environment node MUST be the first line
// of the file, which conflicts with eslint header rule.

/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import getAuthFetcherWithDependencies from "../src/dependencies";
import AuthFetcher from "../src/AuthFetcher";

describe("dependencies.node", () => {
  it("performs dependency injection in a node environment", () => {
    const authFetcher = getAuthFetcherWithDependencies({});
    expect(authFetcher).toBeInstanceOf(AuthFetcher);
  });
});
