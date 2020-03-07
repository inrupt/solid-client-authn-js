/**
 * Options dictating the kind of login needed
 */
import URL from "url-parse";

export default interface ILoginOptions {
  oidcIssuer?: URL;
  webId?: URL;
  redirect: URL;
  clientId: string | URL;
  popUp?: boolean;
  state?: string;
}
