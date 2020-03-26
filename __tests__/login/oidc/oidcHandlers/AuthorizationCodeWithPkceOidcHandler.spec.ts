/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import "reflect-metadata";
import AuthorizationCodeWithPkceOidcHandler from "../../../../src/login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import { JoseUtilityMock } from "../../../../src/jose/__mocks__/JoseUtility";
import { StorageUtilityMock } from "../../../../src/localStorage/__mocks__/StorageUtility";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionCreatorMock } from "../../../../src/solidSession/__mocks__/SessionCreator";
import ISolidSession from "../../../../src/solidSession/ISolidSession";
import IOidcOptions from "../../../../src/login/oidc/IOidcOptions";
import { standardOidcOptions } from "../../../../src/login/oidc/__mocks__/IOidcOptions";

describe("AuthorizationCodeWithPkceOidcHandler", () => {
  const defaultMocks = {
    sessionCreator: SessionCreatorMock,
    joseUtility: JoseUtilityMock,
    storageUtility: StorageUtilityMock
  };
  function getAuthorizationCodeWithPkceOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthorizationCodeWithPkceOidcHandler {
    return new AuthorizationCodeWithPkceOidcHandler(
      mocks.sessionCreator ?? defaultMocks.sessionCreator,
      mocks.joseUtility ?? defaultMocks.joseUtility,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  describe("canHandle", () => {
    const authorizationCodeWithPkceOidcHandler = getAuthorizationCodeWithPkceOidcHandler();
    canHandleTests["authorizationCodeWithPkceOidcHandler"].forEach(
      testConfig => {
        it(testConfig.message, async () => {
          const value = await authorizationCodeWithPkceOidcHandler.canHandle(
            testConfig.oidcOptions
          );
          expect(value).toBe(testConfig.shouldPass);
        });
      }
    );
  });

  describe("handle", () => {
    it("Handles login properly with PKCE", async () => {
      const authorizationCodeWithPkceOidcHandler = getAuthorizationCodeWithPkceOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"]
        }
      };
      const session: ISolidSession = await authorizationCodeWithPkceOidcHandler.handle(
        oidcOptions
      );
      expect(session.neededAction).toBe({
        actionType: "redirect",
        redirectUrl:
          "https://example.com/auth?response_type=id_token%20code&redirect_uri=https%3A%2F%2Fapp.example.com&scope=openid%20profile&client_id=coolApp&code_challenge_method=S256&code_challenge=codeChallenge&state=global"
      });
    });
  });
});
