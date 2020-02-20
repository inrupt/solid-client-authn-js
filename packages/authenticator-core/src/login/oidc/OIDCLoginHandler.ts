/**
 * Handles Common OIDC login functions (Like fetching the configuration)
 */

import { injectable, inject } from "tsyringe";
import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import IOIDCHandler from "./IOIDCHandler";
import IOIDCOptions from "./IOIDCOptions";
import ConfigurationError from "../../util/errors/ConfigurationError";
import { IIssuerConfigFetcher } from "./IssuerConfigFetcher";
import IIssuerConfig from "./IIssuerConfig";
import { IDPoPClientKeyManager } from "../../util/dpop/DPoPClientKeyManager";
import URL from "url-parse";

@injectable()
export default class OIDCLoginHandler implements ILoginHandler {
  constructor(
    @inject("oidcHandler") private oidcHandler: IOIDCHandler,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("dPoPClientKeyManager")
    private dPoPClientKeyManager: IDPoPClientKeyManager
  ) {}

  checkOptions(options: ILoginOptions): Error | null {
    if (!options.oidcIssuer) {
      return new ConfigurationError("OIDCLoginHandler requires an oidcIssuer");
    }
    return null;
  }

  async canHandle(options: ILoginOptions): Promise<boolean> {
    return !this.checkOptions(options);
  }

  async handle(options: ILoginOptions): Promise<void> {
    // Check to ensure the login options are correct
    const optionsError: Error | null = this.checkOptions(options);
    if (optionsError) {
      throw optionsError;
    }

    // Fetch OpenId Config
    const issuerConfig: IIssuerConfig = await this.issuerConfigFetcher.fetchConfig(
      options.oidcIssuer
    );

    // Construct OIDC Options
    const OIDCOptions: IOIDCOptions = {
      issuer: options.oidcIssuer,
      // TODO: differentiate if DPoP should be true
      dpop: true,
      // TODO: This constrains this library to browsers. Figure out what to do with redirect
      redirectUrl: new URL(window.location.href),
      issuerConfiguration: issuerConfig
    };

    // Generate DPoP Key if needed
    // TODO: it might be a good idea to put DPoP related things outside of this file
    if (OIDCOptions.dpop) {
      await this.dPoPClientKeyManager.generateClientKeyIfNotAlready(
        OIDCOptions
      );
    }

    // Call proper OIDC Handler
    await this.oidcHandler.handle(OIDCOptions);
  }
}
