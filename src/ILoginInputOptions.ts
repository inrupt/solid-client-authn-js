import URL from "url-parse";

export default interface ILoginInputOptions {
  oidcIssuer?: string;
  webId?: string;
  redirect: string;
  popUp?: boolean;
  state?: string;
}
