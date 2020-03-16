import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import { URLSearchParams } from "url";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { ISessionCreator } from "../../../solidSession/SessionCreator";
import { IIssuerConfigFetcher } from "../IssuerConfigFetcher";
import IIssuerConfig from "../IIssuerConfig";
import { IFetcher } from "../../../util/Fetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import IJoseUtility from "../../../jose/IJoseUtility";
import INeededInactionAction from "../../../solidSession/INeededInactionAction";

@injectable()
export default class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("fetcher") private fetcher: IFetcher,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("joseUtility") private joseUtility: IJoseUtility
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.code && url.query.state);
  }

  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const url = new URL(redirectUrl, true);
    const localUserId = url.query.state as string;
    const [codeVerifier, issuer, clientId, redirectUri] = await Promise.all([
      await this.storageUtility.getForUser(localUserId, "codeVerifier"),
      await this.storageUtility.getForUser(localUserId, "issuer"),
      await this.storageUtility.getForUser(localUserId, "clientId"),
      await this.storageUtility.getForUser(localUserId, "redirectUri")
    ]);
    // TODO: better error handling
    if (!codeVerifier || !issuer || !clientId || !redirectUri) {
      throw new Error("Code or issuer or clientId verifier not found.");
    }

    const issuerConfig = (await this.issuerConfigFetcher.fetchConfig(
      new URL(issuer)
    )) as IIssuerConfig;

    const requestParams = new URLSearchParams();
    requestParams.append("client_id", clientId as string);
    requestParams.append("grant_type", "authorization_code");
    requestParams.append("code_verifier", codeVerifier);
    requestParams.append("code", url.query.code as string);
    requestParams.append("redirect_uri", redirectUri as string);
    const tokenResponse = await (
      await this.fetcher.fetch(issuerConfig.tokenEndpoint, {
        method: "POST",
        headers: {
          DPoP: await this.dpopHeaderCreator.createHeaderToken(
            issuerConfig.tokenEndpoint,
            "POST"
          ),
          "content-type": "application/x-www-form-urlencoded"
        },
        body: requestParams
      })
    ).json();

    /**
     * TODO: This code will be repeated in other places. Should be factored out
     */
    const decoded = await this.joseUtility.decodeJWT(
      // TODO this should actually be the id_vc of the token
      tokenResponse.access_token as string
    );
    // TODO validate decoded token
    // TODO extract the localUserId from state and put it in the session
    const session = this.sessionCreator.create({
      webId: decoded.sub,
      neededAction: {
        actionType: "inaction"
      } as INeededInactionAction
    });
    await this.storageUtility.setForUser(
      session.localUserId,
      "accessToken",
      url.query.access_token as string
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "idToken",
      url.query.id_token as string
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "webId",
      decoded.sub
    );
    return session;
  }
}
