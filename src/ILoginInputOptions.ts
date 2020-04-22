import URL from "url-parse";

type ILoginInputOptions =
  (IIssuerLoginInputOptions & IRedirectLoginInputOptions) |
  (IIssuerLoginInputOptions & IPopupLoginInputOptions) |
  (IWebIdLoginInputOptions & IRedirectLoginInputOptions) |
  (IWebIdLoginInputOptions & IPopupLoginInputOptions);
export default ILoginInputOptions;

export interface ICoreLoginInuptOptions {
  state?: string;
  clientId?: string;
  doNotAutoRedirect?: boolean;
}

export interface IIssuerLoginInputOptions extends ICoreLoginInuptOptions {
  webId: string;
}

export interface IWebIdLoginInputOptions extends ICoreLoginInuptOptions {
  oidcIssuer: string;
}

export interface IRedirectLoginInputOptions extends ICoreLoginInuptOptions {
  redirect: string;
}

export interface IPopupLoginInputOptions extends ICoreLoginInuptOptions {
  popUp: boolean;
  popUpRedirectPath: string;
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
    doNotAutoRedirect: { type: "boolean" }
  },
  oneOf: [{ required: ["oidcIssuer"] }, { required: ["webId"] }]
};
