/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import URL from "url-parse";

type ILoginInputOptions =
  | (IIssuerLoginInputOptions & IRedirectLoginInputOptions)
  | (IIssuerLoginInputOptions & IPopupLoginInputOptions)
  | (IWebIdLoginInputOptions & IRedirectLoginInputOptions)
  | (IWebIdLoginInputOptions & IPopupLoginInputOptions);
export default ILoginInputOptions;

export interface ICoreLoginInuptOptions {
  state?: string;
  clientId?: string;
  doNotAutoRedirect?: boolean;
  clientName?: string;
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
    doNotAutoRedirect: { type: "boolean" },
    clientName: { type: "string" }
  },
  oneOf: [{ required: ["oidcIssuer"] }, { required: ["webId"] }]
};
