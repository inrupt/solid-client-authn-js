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

import { it, describe, expect } from "@jest/globals";
import { IIssuerConfig, ILoginOptions, IStorageUtility } from "../..";
import { determineSigningAlg, handleRegistration } from "./IClientRegistrar";

describe("handleRegistration", () => {
  it("should perform DCR if a client WebID is provided, but the target IdP does not support Solid-OIDC", async () => {
    const options: ILoginOptions = {
      clientId: "https://some.app/registration#app",
      sessionId: "some session",
      tokenType: "DPoP",
    };
    const clientRegistrar = {
      getClient: jest.fn(),
    };
    await handleRegistration(
      options,
      { solidOidcSupported: undefined } as IIssuerConfig,
      (jest.fn() as unknown) as IStorageUtility,
      clientRegistrar
    );
    expect(clientRegistrar.getClient).toHaveBeenCalled();
  });

  it("should perform DCR if no client ID is provided", async () => {
    const options: ILoginOptions = {
      sessionId: "some session",
      tokenType: "DPoP",
    };
    const clientRegistrar = {
      getClient: jest.fn(),
    };
    await handleRegistration(
      options,
      { solidOidcSupported: undefined } as IIssuerConfig,
      (jest.fn() as unknown) as IStorageUtility,
      clientRegistrar
    );
    expect(clientRegistrar.getClient).toHaveBeenCalled();
  });

  it("should store provided client WebID if one provided and the Identity Provider supports Solid-OIDC", async () => {
    const options: ILoginOptions = {
      sessionId: "some session",
      tokenType: "DPoP",
      clientId: "https://my.app/registration#app",
    };
    const clientRegistrar = {
      getClient: jest.fn(),
    };
    const storageUtility: IStorageUtility = ({
      setForUser: jest.fn(),
    } as unknown) as IStorageUtility;
    await handleRegistration(
      options,
      {
        solidOidcSupported: "https://solidproject.org/TR/solid-oidc",
      } as IIssuerConfig,
      storageUtility,
      clientRegistrar
    );
    expect(clientRegistrar.getClient).not.toHaveBeenCalled();
    expect(storageUtility.setForUser).toHaveBeenCalled();
  });

  it("should store provided client registration information when the client ID is not a WebID", async () => {
    const options: ILoginOptions = {
      sessionId: "some session",
      tokenType: "DPoP",
      clientId: "some statically registered client ID",
      clientName: "some statically registered client name",
      clientSecret: "some statically registered client secret",
    };
    const clientRegistrar = {
      getClient: jest.fn(),
    };
    const storageUtility: IStorageUtility = ({
      setForUser: jest.fn(),
    } as unknown) as IStorageUtility;
    await handleRegistration(
      options,
      {
        solidOidcSupported: undefined,
      } as IIssuerConfig,
      storageUtility,
      clientRegistrar
    );
    expect(clientRegistrar.getClient).not.toHaveBeenCalled();
    expect(storageUtility.setForUser).toHaveBeenCalled();
  });
});

describe("determineSigningAlg", () => {
  it("returns the preferred algorithm of the supported list", () => {
    expect(
      determineSigningAlg(["ES256", "HS256", "RS256"], ["ES256", "RS256"])
    ).toBe("ES256");
    expect(determineSigningAlg(["ES256", "HS256", "RS256"], ["RS256"])).toBe(
      "RS256"
    );
    expect(determineSigningAlg(["RS256"], ["RS256"])).toBe("RS256");
  });

  it("returns undefined if there are no matches", () => {
    expect(determineSigningAlg(["RS256"], ["ES256"])).toBeNull();
  });
});
