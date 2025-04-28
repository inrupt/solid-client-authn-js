//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { jest, it, describe, expect } from "@jest/globals";
import type { SessionTokenSet } from "core";
import { refreshTokens } from "./multisession.fromTokens";
import { Session } from "./Session";

describe("refreshTokens", () => {
  it("returns refreshed tokens when refresh is successful", async () => {
    const newTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      idToken: "new-id-token",
      clientId: "client-id",
      issuer: "https://my.idp",
      webId: "https://my.webid",
      expiresAt: Date.now() / 1000 + 3600,
    };
    // Mock Session.fromTokens static method
    const mockSession = {
      info: {
        isLoggedIn: true,
        sessionId: "test-session-id",
        webId: "https://my.webid",
      },
      login: jest.fn<Session["login"]>().mockResolvedValue(),
      events: {
        on: jest
          .fn<
            (
              event: "newTokens",
              callback: (tokens: SessionTokenSet) => void,
            ) => void
          >()
          .mockImplementation((_, callback) => {
            // Simulate token refresh by calling the callback with new tokens
            callback(newTokens);
          }),
      },
    };

    // Mock the static method
    const originalFromTokens = Session.fromTokens;
    Session.fromTokens = jest
      .fn<typeof Session.fromTokens>()
      .mockResolvedValue(mockSession as unknown as Session);
    const tokenSet = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    const refreshedTokens = await refreshTokens(tokenSet);

    // Verify we got the refreshed tokens
    expect(refreshedTokens).toEqual(newTokens);
    // Restore the original method
    Session.fromTokens = originalFromTokens;
  });

  it("throws an error when refresh fails", async () => {
    // Mock Session.fromTokens static method with a session that fails to log in
    const mockSession = {
      info: {
        isLoggedIn: false, // Session failed to log in
        sessionId: "test-session-id",
      },
      login: jest.fn<Session["login"]>().mockResolvedValue(),
      events: {
        on: jest.fn(),
      },
    };

    // Mock the static method
    const originalFromTokens = Session.fromTokens;
    Session.fromTokens = jest
      .fn<typeof Session.fromTokens>()
      .mockResolvedValue(mockSession as unknown as Session);

    const tokenSet = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    // The function should reject with an error
    await expect(refreshTokens(tokenSet)).rejects.toThrow(
      "Could not refresh the session.",
    );

    // Restore the original method
    Session.fromTokens = originalFromTokens;
  });
});
