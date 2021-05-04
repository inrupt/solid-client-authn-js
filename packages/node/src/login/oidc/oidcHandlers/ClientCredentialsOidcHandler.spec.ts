/*
 * Copyright 2021 Inrupt Inc.
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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import "reflect-metadata";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";
import { standardOidcOptions } from "../__mocks__/IOidcOptions";
import ClientCredentialsOidcHandler from "./ClientCredentialsOidcHandler";

describe("ClientCredentialsOidcHandler", () => {
  describe("canHandle", () => {
    it("cannot handle if the client ID is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: (undefined as unknown) as string,
          },
        })
      ).resolves.toEqual(false);
    });

    it("cannot handle if the client secret is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: undefined,
          },
        })
      ).resolves.toEqual(false);
    });

    it("cannot handle if the client is public", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: "some secret",
            isPublic: true,
          },
        })
      ).resolves.toEqual(false);
    });

    it("cannot handle if the client's nature (public or confidential) is unknown", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: "some secret",
            isPublic: (undefined as unknown) as boolean,
          },
        })
      ).resolves.toEqual(false);
    });

    it("can handle if both client ID and secret are present for a confidential client", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: "some client secret",
            isPublic: false,
          },
        })
      ).resolves.toEqual(true);
    });
  });

  describe("handle", () => {
    it("isn't implemented yet", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(() =>
        clientCredentialsOidcHandler.handle(standardOidcOptions)
      ).rejects.toThrow("not implemented");
    });
  });
});
