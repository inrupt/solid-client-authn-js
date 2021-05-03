/*
 * Copyright 2021 Inrupt Inc.
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

import { ISessionInfo } from "@inrupt/solid-client-authn-core";

/**
 * Redirects the browser to a provided IRI, but does such redirection in a child
 * iframe. This is used to have a front-channel interaction with the Solid Identity
 * Provider without having the user involved, and without refreshing the main window.
 *
 * @param redirectUrl The IRI to which the iframe should be redirected.
 */
export function redirectInIframe(redirectUrl: string): void {
  const iframe = window.document.createElement("iframe");
  iframe.setAttribute("id", "token-renewal");
  iframe.setAttribute("name", "token-renewal");
  iframe.setAttribute("hidden", "true");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  window.document.body.appendChild(iframe);
  iframe.src = redirectUrl;
}

/**
 * This function sets up an event listener that will receive iframe messages.
 * It is only listening to messages coming from iframes that could have been
 * opened by the library, and expects to be posted the IRI the iframe has been
 * redirected to by the Solid Identity Provider. This way, the top window can
 * perform the backchannel exchange to the token endpoint without performing
 * the front-channel redirection.
 *
 * @param handleIframeRedirect Redirect URL sent by the iframe
 */
export function setupIframeListener(
  handleIframeRedirect: (
    redirectUrl: string
  ) => Promise<unknown>
): void {
  window.addEventListener("message", async (evt: MessageEvent) => {
    const frameElement = document
      .getElementsByTagName("iframe")
      .namedItem("token-renewal");

    if (
      evt.origin === window.location.origin &&
      evt.source === frameElement?.contentWindow
    ) {
      if (typeof evt.data.redirectUrl === "string") {
        // The top-level window handles the redirect that happened in the iframe.
        await handleIframeRedirect(evt.data.redirectUrl);
      }
    }
    // Clean up the iframe from the DOM
    if (frameElement !== null) {
      window.document.body.removeChild(frameElement);
    }
  });
}

/**
 * This function bubbles up the result of the front-channel interaction with
 * the authorization endpoint to the parent window.
 */
export function postRedirectUrlToParent(
  redirectUrl: string,
  targetOrigin: string
): void {
  window.top.postMessage(
    {
      redirectUrl,
    },
    targetOrigin
  );
}
