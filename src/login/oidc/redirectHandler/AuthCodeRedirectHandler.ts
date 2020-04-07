import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IIssuerConfigFetcher } from "../IssuerConfigFetcher";
import IIssuerConfig from "../IIssuerConfig";
import { IFetcher } from "../../../util/Fetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import formurlencoded from "form-urlencoded";
import { ITokenSaver } from "./TokenSaver";
import { IRedirector } from "../Redirector";

@injectable()
export default class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("fetcher") private fetcher: IFetcher,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("tokenSaver") private tokenSaver: ITokenSaver,
    @inject("redirector") private redirector: IRedirector
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
        /* eslint-disable @typescript-eslint/camelcase */
        body: formurlencoded({
          client_id: clientId as string,
          grant_type: "authorization_code",
          code_verifier: codeVerifier as string,
          code: url.query.code as string,
          redirect_uri: redirectUri as string
        })
        /* eslint-enable @typescript-eslint/camelcase */
      })
    ).json();

    // TODO: should handle error if the token response is something strange

    const session = await this.tokenSaver.saveTokenAndGetSession(
      localUserId,
      tokenResponse.id_token,
      tokenResponse.access_token
    );

    delete url.query.code;
    delete url.query.state;
    session.neededAction = this.redirector.redirect(url.toString(), {});

    return session;
  }
}
