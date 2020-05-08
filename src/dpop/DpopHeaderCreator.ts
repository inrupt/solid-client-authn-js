/**
 * Creates a DPoP JWT to be embedded in the header
 */
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import IJoseUtility from "../jose/IJoseUtility";
import { IDpopClientKeyManager } from "./DpopClientKeyManager";
import { IUuidGenerator } from "../util/UuidGenerator";

export interface IDpopHeaderCreator {
  /**
   * Creates the Dpop Header token
   * @param audience The URL of the RS
   * @param method The HTTP method that is being used
   */
  createHeaderToken(audience: URL, method: string): Promise<string>;
}

@injectable()
export default class DpopHeaderCreator implements IDpopHeaderCreator {
  constructor(
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("dpopClientKeyManager")
    private dpopClientKeyManager: IDpopClientKeyManager,
    @inject("uuidGenerator") private uuidGenerator: IUuidGenerator
  ) {}

  public normalizeHtu(audience: URL): string {
    return `${audience.origin}${audience.pathname}`;
  }

  async createHeaderToken(audience: URL, method: string): Promise<string> {
    // TODO: update for multiple signing abilities
    const clientKey = await this.dpopClientKeyManager.getClientKey();

    if (clientKey === null) {
      throw new Error("Could not obtain the key to sign the token with.");
    }

    return this.joseUtility.signJWT(
      {
        // TODO: should add a slash at the end if none is present
        htu: this.normalizeHtu(audience),
        htm: method,
        jti: this.uuidGenerator.v4()
      },
      clientKey,
      {
        header: {
          jwk: await this.joseUtility.privateJWKToPublicJWK(clientKey),
          typ: "dpop+jwt"
        },
        expiresIn: "1 hour",
        algorithm: "RS256"
      }
    );
  }
}
