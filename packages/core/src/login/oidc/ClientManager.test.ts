/*
 * Copyright 2022 Inrupt Inc.
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

import { jest, it, describe, expect } from "@jest/globals";
import { IIssuerConfig, ILoginOptions, IStorageUtility } from "../..";
import {
  determineClientType,
  determineSigningAlg,
  negotiateClientSigningAlg,
  ClientManager,
} from "./ClientManager";
import type { IDynamicClientRegistrar } from "./IDynamicClientRegistrar";
import { mockIssuerConfig } from "./__mocks__/IssuerConfig";

describe.skip("ClientManager", () => {
  /*
  describe("handleRegistration", () => {
    it("should perform DCR if a client WebID is provided, but the target IdP does not support Solid-OIDC", async () => {
      const options: ILoginOptions = {
        clientId: "https://some.app/registration#app",
        sessionId: "some session",
        tokenType: "DPoP",
      };
      const dynamicClientRegistrar = {
        getClient: jest.fn(),
      };
      await handleRegistration(
        options,
        { scopesSupported: ["openid"] } as IIssuerConfig,
        jest.fn() as unknown as IStorageUtility,
        dynamicClientRegistrar as IDynamicClientRegistrar
      );
      expect(dynamicClientRegistrar.getClient).toHaveBeenCalled();
    });

    it("should perform DCR if no client ID is provided", async () => {
      const options: ILoginOptions = {
        sessionId: "some session",
        tokenType: "DPoP",
      };
      const dynamicClientRegistrar = {
        getClient: jest.fn(),
      };
      await handleRegistration(
        options,
        { scopesSupported: ["openid"] } as IIssuerConfig,
        jest.fn() as unknown as IStorageUtility,
        dynamicClientRegistrar as IDynamicClientRegistrar
      );
      expect(dynamicClientRegistrar.getClient).toHaveBeenCalled();
    });

    it("should store provided client WebID if one provided and the Identity Provider supports Solid-OIDC", async () => {
      const options: ILoginOptions = {
        sessionId: "some session",
        tokenType: "DPoP",
        clientId: "https://my.app/registration#app",
      };
      const dynamicClientRegistrar = {
        getClient: jest.fn(),
      };
      const storageUtility: IStorageUtility = {
        setForUser: jest.fn(),
      } as unknown as IStorageUtility;
      const client = await handleRegistration(
        options,
        {
          scopesSupported: ["openid", "offline_access", "webid"],
        } as IIssuerConfig,
        storageUtility,
        dynamicClientRegistrar as IDynamicClientRegistrar
      );
      expect(dynamicClientRegistrar.getClient).not.toHaveBeenCalled();
      expect(storageUtility.setForUser).toHaveBeenCalled();
      expect(client.clientType).toBe("solid-oidc");
    });

    it("should store provided client registration information when the client ID is not a WebID", async () => {
      const options: ILoginOptions = {
        sessionId: "some session",
        tokenType: "DPoP",
        clientId: "some statically registered client ID",
        clientName: "some statically registered client name",
        clientSecret: "some statically registered client secret",
      };
      const dynamicClientRegistrar = {
        getClient: jest.fn(),
      };
      const storageUtility: IStorageUtility = {
        setForUser: jest.fn(),
      } as unknown as IStorageUtility;
      const client = await handleRegistration(
        options,
        {
          scopesSupported: ["openid"],
        } as IIssuerConfig,
        storageUtility,
        dynamicClientRegistrar as IDynamicClientRegistrar
      );
      expect(dynamicClientRegistrar.getClient).not.toHaveBeenCalled();
      expect(storageUtility.setForUser).toHaveBeenCalled();
      expect(client.clientType).toBe("static");
    });
  });
  */
});

describe("determineClientType", () => {
  it("returns the correct client type for issuers with no scopes supported", () => {
    const issuerConfig = mockIssuerConfig({ scopesSupported: [] });

    // FIXME: should also require `clientSecret`
    expect(determineClientType({ clientId: "abc123" }, issuerConfig)).toBe(
      "static"
    );
    expect(
      determineClientType({ clientId: "https://client.example" }, issuerConfig)
    ).toBe("dynamic");
  });

  it("returns the correct client type for issuers with the webid scope supported", () => {
    const issuerConfig = mockIssuerConfig({ scopesSupported: ["webid"] });

    // FIXME: should also require `clientSecret`
    expect(determineClientType({ clientId: "abc123" }, issuerConfig)).toBe(
      "static"
    );

    expect(
      determineClientType({ clientId: "https://client.example" }, issuerConfig)
    ).toBe("solid-oidc");

    expect(
      determineClientType({ clientName: "client example" }, issuerConfig)
    ).toBe("dynamic");
  });
});

describe("negotiateSigningAlg", () => {
  it("correctly negotiates signing algorithm with the client", () => {
    const issuerConfig = mockIssuerConfig({
      idTokenSigningAlgValuesSupported: ["ES256", "RS256"],
    });

    expect(negotiateClientSigningAlg(issuerConfig, ["RS256"])).toBe("RS256");
  });

  it("throws if the issuer doesn't advertise for supported signing algorithms", () => {
    // By default does not have id_token_signing_alg_values_supported set:
    const issuerConfig = mockIssuerConfig();

    expect(issuerConfig.idTokenEncryptionAlgValuesSupported).toBeUndefined();

    expect(() => negotiateClientSigningAlg(issuerConfig, ["RS256"])).toThrow(
      "The OIDC issuer discovery profile is missing the 'id_token_signing_alg_values_supported' value, which is mandatory."
    );
  });

  it("throws if no signing algorithm supported by the issuer matches the client preferences", () => {
    const issuerConfig = mockIssuerConfig({
      idTokenSigningAlgValuesSupported: ["Some_bogus_algorithm"],
    });

    expect(() =>
      negotiateClientSigningAlg(issuerConfig, ["ES256", "RS256"])
    ).toThrow(
      'No signature algorithm match between ["Some_bogus_algorithm"] supported by the Identity Provider and ["ES256","RS256"] preferred by the client.'
    );
  });

  it("throws if no signing algorithm supported by the client preferences matches that supported by the issuer", () => {
    const issuerConfig = mockIssuerConfig({
      idTokenSigningAlgValuesSupported: ["ES256", "RS256"],
    });

    expect(() =>
      negotiateClientSigningAlg(issuerConfig, ["Some_bogus_algorithm"])
    ).toThrow(
      'No signature algorithm match between ["ES256","RS256"] supported by the Identity Provider and ["Some_bogus_algorithm"] preferred by the client.'
    );
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

  it("returns null if there are no matches", () => {
    expect(determineSigningAlg(["RS256"], ["ES256"])).toBeNull();
    expect(determineSigningAlg(["RS256"], [])).toBeNull();
  });
});
