import URL from "url-parse";

export default interface ILoginInputOptions {
  oidcIssuer?: string;
  webId?: string;
  redirect: string;
  popUp?: boolean;
  popUpRedirectPath?: string;
  state?: string;
  clientId?: string;
  doNotAutoRedirect?: boolean;
}

export const loginInputOptionsSchema = {
  type: "object",
  properties: {
    oidcIssuer: { type: "string", format: "uri", shouldConvertToUrl: true },
    webId: { type: "string", format: "uri", shouldConvertToUrl: true },
    redirect: { type: "string", format: "uri", shouldConvertToUrl: true },
    popUp: { type: "boolean" },
    popUpRedirectPath: { type: "string" },
    state: { type: "string" },
    clientId: { type: "string" },
    doNotAutoRedirect: { type: "string" }
  },
  required: ["redirect"],
  oneOf: [{ required: ["oidcIssuer"] }, { required: ["webId"] }]
};
