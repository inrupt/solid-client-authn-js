/**
 * Defines how OIDC login should proceed
 */
import URL from "url-parse";
import IIssuerConfig from "./IIssuerConfig";

/**
 * @issuer The URL of the IDP
 * @dpop True if a dpop compatible auth_token should be fetched
 * @redirectUrl The URL to which the user should be redirected after authorizing
 * @issuerConfiguration The openid-configuration of the issuer
 */
export default interface IOidcOptions {
  issuer: URL;
  dpop: boolean;
  redirectUrl: URL;
  issuerConfiguration: IIssuerConfig;
  clientId: string;
  localUserId?: string;
}
