/**
 * Copyright 2020 Inrupt Inc.
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
import TokenRefresher from "../../../../src/login/oidc/refresh/TokenRefresher";
import { TokenRequesterMock } from "../../../../src/login/oidc/__mocks__/TokenRequester";
import { StorageUtilityMock } from "@inrupt/solid-client-authn-core";

describe("TokenRefresher", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    tokenRequester: TokenRequesterMock,
  };
  function getTokenRefresher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): TokenRefresher {
    return new TokenRefresher(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.tokenRequester ?? defaultMocks.tokenRequester
    );
  }

  it("Refreshes the token properly", async () => {
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      "refreshToken"
    );
    const tokenRefresher = getTokenRefresher();
    await tokenRefresher.refresh("global");
    /* eslint-disable @typescript-eslint/camelcase */
    expect(defaultMocks.tokenRequester.request).toHaveBeenCalledWith("global", {
      grant_type: "refresh_token",
      refresh_token: "refreshToken",
    });
    /* eslint-enable @typescript-eslint/camelcase */
  });
});
