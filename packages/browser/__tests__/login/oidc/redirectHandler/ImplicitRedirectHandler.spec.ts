/*
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
import { TokenSaverMock } from "../../../../src/login/oidc/redirectHandler/__mocks__/TokenSaver";
import {
  SessionInfoManagerMock,
  SessionCreatorCreateResponse,
} from "../../../../src/sessionInfo/__mocks__/SessionInfoManager";
import { ImplicitRedirectHandler } from "../../../../src/login/oidc/redirectHandler/ImplicitRedirectHandler";

jest.mock("cross-fetch");

// The following key has been used to sign the mock access token. It is given
// for an information purpose.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _mockJWK = {
  kty: "EC",
  kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
  alg: "ES256",
  crv: "P-256",
  x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
  y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
  d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
};

// Payload: { sub: "https://my.webid" }
const mockAccessToken =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0Q2xhaW0iOiJ0ZXN0VmFsdWUiLCJpYXQiOjE2MDIxNTg2NDJ9.wGZ49jU3wNSAFvWvZsjjulmbfRjlIQMp0VY0Q5u2--5vyzeKwfGUmssOW8kftIXG1ikm2iqMb6YRXCO4KGEctQ";

describe("ImplicitRedirectHandler", () => {
  const defaultMocks = {
    tokenSaver: TokenSaverMock,
    sessionInfoManager: SessionInfoManagerMock,
  };

  function getImplicitRedirectHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ImplicitRedirectHandler {
    return new ImplicitRedirectHandler(
      mocks.tokenSaver ?? defaultMocks.tokenSaver,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager
    );
  }

  describe("canHandler", () => {
    it("Accepts a valid url with the correct query", async () => {
      const generalRedirectHandler = getImplicitRedirectHandler();
      expect(
        await generalRedirectHandler.canHandle(
          "https://coolparty.com/?id_token=token&access_token=otherToken&state=userId"
        )
      ).toBe(true);
    });

    it("throws on invalid url", async () => {
      const redirectHandler = getImplicitRedirectHandler();
      await expect(() =>
        redirectHandler.canHandle("beep boop I am a robot")
      ).rejects.toThrow(
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL."
      );
    });

    it("Accepts a valid url with the incorrect query", async () => {
      const generalRedirectHandler = getImplicitRedirectHandler();
      expect(
        await generalRedirectHandler.canHandle(
          "https://coolparty.com/?meep=mop"
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("throws on non-redirect URL", async () => {
      const redirectHandler = getImplicitRedirectHandler();
      await expect(redirectHandler.handle("https://my.app")).rejects.toThrow(
        "ImplicitRedirectHandler cannot handle [https://my.app]"
      );
    });

    it("Transfers the correct url component to the session creator", async () => {
      const generalRedirectHandler = getImplicitRedirectHandler();
      expect(
        await generalRedirectHandler.handle(
          "https://coolsite/?id_token=a&access_token=b&state=c"
        )
      ).toBe(SessionCreatorCreateResponse);
      expect(defaultMocks.tokenSaver.saveSession).toHaveBeenCalledWith(
        "c",
        "a",
        "b"
      );
    });

    // We use ts-ignore comments here only to access mock call arguments
    /* eslint-disable @typescript-eslint/ban-ts-ignore */
    it("returns an authenticated fetch", async () => {
      const fetch = jest.requireMock("cross-fetch") as {
        fetch: jest.Mock<
          ReturnType<typeof window.fetch>,
          [RequestInfo, RequestInit?]
        >;
      };
      const redirectUrl = new URL("http://some.url");
      redirectUrl.searchParams.append("access_token", mockAccessToken);
      redirectUrl.searchParams.append("id_token", "Some ID token");
      redirectUrl.searchParams.append("state", "Idaho");

      const authCodeRedirectHandler = getImplicitRedirectHandler();
      const redirectInfo = await authCodeRedirectHandler.handle(
        redirectUrl.toString()
      );
      await redirectInfo.fetch("https://some.other.url");
      // @ts-ignore
      const header = fetch.fetch.mock.calls[0][1].headers["Authorization"];
      // We test that the Authorization header matches the structure of a JWT.
      expect(
        // @ts-ignore
        header
      ).toMatch(/^Bearer .+\..+\..+$/);
    });
  });
});
