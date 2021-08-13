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

import { jest, it, describe, expect } from "@jest/globals";
import {
  postRedirectUrlToParent,
  redirectInIframe,
  setupIframeListener,
} from "./iframe";

describe("redirectInIframe", () => {
  it("creates an iframe with the appropriate attributes and performs the redirection in it", () => {
    redirectInIframe("http://some.iri");

    const iframe = document.getElementsByTagName("iframe")[0];

    // This verifies that the iframe has been added to the DOM, i.e. that
    // window.document.body.appendChild has been called.
    expect(iframe).not.toBeUndefined();

    // The iframe has the appropriate attributes.
    expect(iframe.getAttribute("hidden")).toBe("true");
    expect(iframe.getAttribute("sandbox")).toBe(
      "allow-scripts allow-same-origin"
    );
    expect(iframe.getAttribute("src")).toBe("http://some.iri");
  });
});

describe("setupIframeListener", () => {
  const setupDom = (originMatch: boolean, sourceMatch: boolean) => {
    jest.spyOn(window, "location", "get").mockReturnValue({
      // The test iframe message has "" as an origin.
      origin: originMatch ? "" : "https://some.other/origin",
    } as Location);

    // Mock mismatching window
    redirectInIframe("http://some.iri");
    const iframe = document.getElementsByTagName("iframe")[0];
    jest
      .spyOn(iframe, "contentWindow", "get")
      .mockReturnValue((sourceMatch ? null : ({} as unknown)) as Window);
  };

  const mockEventListener = () => {
    let messageReceived = false;
    // This promis prevents the test from completing while the message event
    // hasn't been received, to ensure the listener callback is executed.

    // The following promise has an async executor to be able to sleep
    // while waiting for a change.
    // eslint-disable-next-line no-async-promise-executor
    const blockingPromise = new Promise(async (resolve) => {
      while (!messageReceived) {
        // Wait for the message event to be processed.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
      }
      resolve(undefined);
    });
    window.addEventListener("message", () => {
      messageReceived = true;
    });
    return blockingPromise;
  };

  it("ignores message from iframes on different origins", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    setupDom(false, true);
    setupIframeListener(callback as any);

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores messages from iframes with an unknown source", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    setupDom(true, false);
    setupIframeListener(callback as any);

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores messages from valid iframes but with an unexpected structure", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    setupDom(true, true);
    setupIframeListener(callback as any);

    window.postMessage(
      {
        // We expect a message with a 'redirectUrl' property.
        someUnknownkey: "some value",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls the given callback", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    setupDom(true, true);
    setupIframeListener(callback as any);

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(callback).toHaveBeenCalled();
  });

  it("cleans up the iframe after the message is received", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    setupDom(true, true);
    setupIframeListener(callback as any);

    expect(document.getElementsByTagName("iframe")[0]).not.toBeUndefined();

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    // Verify that the iframe has correctly been removed from the DOM
    expect(document.getElementsByTagName("iframe")[0]).toBeUndefined();
  });
});

describe("postRedirectUrlToParent", () => {
  it("posts a message to the parent window with the provided url", () => {
    const spyPost = jest.spyOn(window.top, "postMessage");
    jest.spyOn(window, "location", "get").mockReturnValue({
      origin: "https://some.origin/",
    } as unknown as Location);
    postRedirectUrlToParent("https://some.redirect.url/");
    expect(spyPost).toHaveBeenCalledWith(
      { redirectUrl: "https://some.redirect.url/" },
      "https://some.origin/"
    );
  });
});
