import URL from "url-parse";

export default interface ILoginInputOptions {
  oidcIssuer?: string | URL;
  webId?: string | URL;
  redirect: string | URL;
  clientId: string | URL;
  popUp?: boolean;
  state?: string;
}
