/**
 * Options dictating the kind of login needed
 */
import URL from "url-parse";

export default interface ILoginOptions {
  localUserId?: string;
  oidcIssuer?: URL;
  webId?: URL;
  redirect: URL;
  popUp?: boolean;
  state?: string;
  clientId?: "global" | string;
}
