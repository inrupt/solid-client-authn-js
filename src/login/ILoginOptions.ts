/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * Options dictating the kind of login needed
 */
import URL from "url-parse";

export default interface ILoginOptions {
  localUserId?: "global" | string;
  oidcIssuer?: URL;
  webId?: URL;
  redirect?: URL;
  popUp?: boolean;
  popUpRedirectPath?: string;
  state?: string;
  clientId?: string;
  doNotAutoRedirect?: boolean;
}
