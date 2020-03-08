import URL from "url-parse";

export default interface ILoginInputOptions {
  oidcIssuer?: string;
  webId?: string;
  redirect: string;
  popUp?: boolean;
  state?: string;
}

export const loginInputOptionsSchema = {
  type: "object",
  properties: {
    oidcIssuer: { type: "string", format: "uri", shouldConvertToUrl: true },
    webId: { type: "string", format: "uri", shouldConvertToUrl: true },
    redirect: { type: "string", format: "uri", shouldConvertToUrl: true },
    popUp: { type: "boolean" },
    state: { type: "string" }
  },
  required: ["redirect"],
  oneOf: [{ required: ["oidcIssuer"] }, { required: ["webId"] }]
};
