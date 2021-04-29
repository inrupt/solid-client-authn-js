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

import { it, describe } from "@jest/globals";
import {
  postRedirectUrlToParent,
  redirectInIframe,
  setupIframeListener,
} from "../src/iframe";

describe("redirectInIframe", () => {
  it("creates an iframe with the appropriate attributes and performs the redirection in it", () => {
    const appendChild = jest.spyOn(window.document.body, "appendChild");
    appendChild.mockImplementation(jest.fn());
    const createElement = jest.spyOn(window.document, "createElement");
    const mockIframe = {
      setAttribute: jest.fn(),
      src: undefined,
    };
    createElement.mockReturnValueOnce((mockIframe as unknown) as HTMLElement);
    redirectInIframe("http://some.iri");

    // The iframe has the appropriate attributes.
    expect(mockIframe.setAttribute).toHaveBeenCalledTimes(4);
    expect(mockIframe.setAttribute).toHaveBeenNthCalledWith(
      1,
      "id",
      "token-renewal"
    );
    expect(mockIframe.setAttribute).toHaveBeenNthCalledWith(
      2,
      "name",
      "token-renewal"
    );
    expect(mockIframe.setAttribute).toHaveBeenNthCalledWith(
      3,
      "hidden",
      "true"
    );
    expect(mockIframe.setAttribute).toHaveBeenNthCalledWith(
      4,
      "sandbox",
      "allow-scripts allow-same-origin"
    );

    // The iframe src is set to the redirect IRI.
    expect(mockIframe.src).toBe("http://some.iri");

    // The iframe is appended to the body.
    expect(appendChild).toHaveBeenCalledWith(mockIframe);
  });
});

describe("setupIframeListener", () => {
  const setupMockEvent = (
    originMatch: boolean,
    sourceMatch: boolean,
    iframeExists: boolean
  ) => {
    // Create a mock iframe, and make it match the event source or not.
    const mockedFrame = iframeExists
      ? (({
          // The event source is null in the test environment.
          contentWindow: sourceMatch ? null : window,
        } as unknown) as HTMLIFrameElement)
      : null;

    // Pretend that the iframe is present in the DOM
    const mockedCollection = ({
      namedItem: () => mockedFrame,
    } as unknown) as HTMLCollectionOf<HTMLIFrameElement>;
    jest
      .spyOn(document, "getElementsByTagName")
      .mockReturnValue(mockedCollection);

    // The event origin is "" in the test environement.
    jest.spyOn(window, "location", "get").mockReturnValue({
      origin: originMatch ? "" : "https://some.other/origin",
    } as Location);

    // Pretend that we can remove the iframe from the DOM
    const mockedRemove = jest
      .spyOn(window.document.body, "removeChild")
      .mockReturnValue(window.document.createElement("iframe"));
    return {
      mockedRemove,
    };
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
    // Mock mismatching origins
    setupMockEvent(false, true, true);
    setupIframeListener(callback);

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores messages not from iframes", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    // Mock mismatching identifier
    setupMockEvent(true, true, false);
    setupIframeListener(callback);

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores messages from iframes with an unknown identifier", async () => {
    const callback = jest.fn();
    const blockingPromise = mockEventListener();
    // Mock mismatching identifier
    setupMockEvent(true, false, true);
    setupIframeListener(callback);

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
    setupMockEvent(true, true, true);
    setupIframeListener(callback);

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
    setupMockEvent(true, true, true);
    setupIframeListener(callback);

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
    const spyRemove = setupMockEvent(true, true, true).mockedRemove;
    setupIframeListener(callback);

    window.postMessage(
      {
        redirectUrl: "http://some.redirect/url",
      },
      "http://localhost"
    );

    await blockingPromise;

    expect(spyRemove).toHaveBeenCalled();
  });
});

describe("postRedirectUrlToParent", () => {
  it("posts a message to the parent window with the provided origin and url", () => {
    const spyPost = jest.spyOn(window.top, "postMessage");
    postRedirectUrlToParent(
      "https://some.redirect.url/",
      "https://some.origin/"
    );
    expect(spyPost).toHaveBeenCalledWith(
      { redirectUrl: "https://some.redirect.url/" },
      "https://some.origin/"
    );
  });
});
