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
import { IHandleIncomingRedirectOptions } from "./Session";

export function setupIframeListener(
  handleIframeRedirect: (
    inputOptions: string | IHandleIncomingRedirectOptions
  ) => Promise<ISessionInfo | undefined>
) {
  window.onmessage = async (evt: MessageEvent) => {
    if (window.frameElement) {
      console.log("received an iframe message in iframe");
    } else {
      console.log("received an iframe message in main window");
    }

    if (evt.origin === window.location.origin) {
      // if (evt.source === window.frames["token-renewal"]) {
      //   console.log("source matches")
      // } else {
      //   console.log("source deos not match")
      // }
      console.log(`event data: ${JSON.stringify(evt.data)}`);
      if (evt.data.redirectUrl) {
        console.log(`received redirect URL: ${evt.data.redirectUrl}`);
        await handleIframeRedirect({
          url: evt.data.redirectUrl,
        });
      } else if (evt.data.error) {
        console.log(evt.data);
      }
    } else {
      console.log(`${evt.origin} does not match ${window.location.origin}`);
    }
  };
}

export function postRedirectUrlToParent() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  if (code) {
    console.log(`Posting message to ${window.location.origin}`);
    window.top.postMessage(
      { redirectUrl: window.location.href },
      window.location.origin
    );
  } else {
    const error = urlParams.get("error");
    const description = urlParams.get("error_description");
    if (error) {
      window.top.postMessage(
        { error: error, error_description: description },
        window.location.origin
      );
    }
  }
}
