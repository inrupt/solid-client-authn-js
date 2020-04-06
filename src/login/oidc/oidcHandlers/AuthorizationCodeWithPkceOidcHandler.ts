/**
 * Handler for the Authorization Code with PKCE Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import URL from "url-parse";
import ISolidSession from "../../../solidSession/ISolidSession";
import { injectable, inject } from "tsyringe";
import { ISessionCreator } from "../../../solidSession/SessionCreator";
import IJoseUtility from "../../../jose/IJoseUtility";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IRedirector } from "../Redirector";

@injectable()
export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler {
  constructor(
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("redirector") private redirector: IRedirector
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grantTypesSupported &&
      oidcLoginOptions.issuerConfiguration.grantTypesSupported.indexOf(
        "authorization_code"
      ) > -1
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<ISolidSession> {
    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorizationEndpoint.toString()
    );
    const codeVerifier = await this.joseUtility.generateCodeVerifier();
    const session = this.sessionCreator.create({
      localUserId: oidcLoginOptions.localUserId
    });
    // Disable camel case rule because this query requires camel case
    /* eslint-disable @typescript-eslint/camelcase */
    const query: { [key: string]: string } = {
      response_type: "id_token code",
      redirect_uri: oidcLoginOptions.redirectUrl.toString(),
      scope: "openid profile",
      client_id: oidcLoginOptions.clientId,
      code_challenge_method: "S256",
      code_challenge: await this.joseUtility.generateCodeChallenge(
        codeVerifier
      ),
      state: session.localUserId
    };
    /* eslint-enable @typescript-eslint/camelcase */
    requestUrl.set("query", query);

    // TODO: This is inefficent, there should be a bulk
    console.log("SETTING MY GUYS");
    await this.storageUtility.setForUser(
      session.localUserId,
      "codeVerifier",
      codeVerifier
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "issuer",
      oidcLoginOptions.issuer.toString()
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "clientId",
      oidcLoginOptions.clientId
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "redirectUri",
      oidcLoginOptions.redirectUrl.toString()
    );

    session.neededAction = this.redirector.redirect(requestUrl.toString());

    return session;
  }
}
