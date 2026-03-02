// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import http2 from "node:http2";
import type tls from "node:tls";
import { Readable } from "node:stream";

const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

/**
 * A fetch-compatible function that uses HTTP/2 as the underlying transport.
 *
 * Callable with the same signature as the standard
 * [fetch API](https://developer.mozilla.org/docs/Web/API/Fetch_API).
 * Includes a {@link Http2Fetch.close | close()} method that shuts down all
 * pooled HTTP/2 sessions. You should call `close()` when the fetch instance
 * is no longer needed (e.g. on application shutdown) to release TCP connections
 * and allow the Node.js process to exit cleanly.
 *
 * @since 2.6.0
 */
export type Http2Fetch = typeof fetch & {
  /** Closes all pooled HTTP/2 sessions and releases their TCP connections. */
  close(): void;
};

interface SessionEntry {
  session: http2.ClientHttp2Session;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Creates an HTTP/2-aware fetch function compatible with the standard
 * [fetch API](https://developer.mozilla.org/docs/Web/API/Fetch_API).
 *
 * All requests to the same origin share a single HTTP/2 connection, enabling
 * multiplexing of concurrent requests. This provides significant performance
 * improvements when making many requests to the same server, as is common
 * when interacting with Solid pods.
 *
 * The returned function can be passed as the `fetch` option to any
 * `@inrupt/solid-client` function, or used with `new Session({ http2: true })`
 * for automatic integration.
 *
 * @param options Configuration for the HTTP/2 connection pool.
 * @param options.idleTimeout Milliseconds of inactivity before an HTTP/2
 *   session is closed. Defaults to 30 000 (30 seconds).
 * @param options.tlsOptions TLS options forwarded to `http2.connect()`.
 *   Useful for custom CA certificates or disabling certificate verification
 *   in development/testing.
 * @returns A fetch-compatible function with an additional `close()` method.
 *
 * @example
 * ```typescript
 * import { createHttp2Fetch } from "@inrupt/solid-client-authn-node";
 * import { getSolidDataset } from "@inrupt/solid-client";
 *
 * const h2fetch = createHttp2Fetch();
 * const dataset = await getSolidDataset(url, { fetch: h2fetch });
 * h2fetch.close();
 * ```
 *
 * @since 2.6.0
 */
export function createHttp2Fetch(
  options: { idleTimeout?: number; tlsOptions?: tls.ConnectionOptions } = {},
): Http2Fetch {
  const idleTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT_MS;
  const pool = new Map<string, SessionEntry>();

  function getOrCreateSession(origin: string): http2.ClientHttp2Session {
    const existing = pool.get(origin);
    if (existing && !existing.session.closed && !existing.session.destroyed) {
      resetIdleTimer(origin, existing);
      return existing.session;
    }

    const session = http2.connect(origin, options.tlsOptions);

    session.on("error", () => {
      cleanupSession(origin);
    });
    session.on("close", () => {
      pool.delete(origin);
    });

    const entry: SessionEntry = { session, idleTimer: null };
    pool.set(origin, entry);
    resetIdleTimer(origin, entry);
    return session;
  }

  function resetIdleTimer(origin: string, entry: SessionEntry): void {
    if (entry.idleTimer !== null) {
      clearTimeout(entry.idleTimer);
    }
    entry.idleTimer = setTimeout(() => {
      cleanupSession(origin);
    }, idleTimeout);
  }

  function cleanupSession(origin: string): void {
    const entry = pool.get(origin);
    if (entry) {
      if (entry.idleTimer !== null) {
        clearTimeout(entry.idleTimer);
      }
      if (!entry.session.closed && !entry.session.destroyed) {
        entry.session.close();
      }
      pool.delete(origin);
    }
  }

  const h2fetch: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      input instanceof URL
        ? input
        : input instanceof Request
          ? new URL(input.url)
          : new URL(input);

    const origin = url.origin;
    const path = url.pathname + url.search;

    const headers: Record<string, string> = {
      ":method": init?.method?.toUpperCase() ?? "GET",
      ":path": path,
    };

    // Copy headers from init
    if (init?.headers) {
      const entries =
        init.headers instanceof Headers
          ? Array.from(init.headers.entries())
          : Array.isArray(init.headers)
            ? init.headers
            : Object.entries(init.headers);
      for (const [key, value] of entries) {
        headers[key.toLowerCase()] = value;
      }
    }

    // Copy headers from Request object if input is a Request
    if (input instanceof Request) {
      for (const [key, value] of input.headers.entries()) {
        // Don't override headers from init
        if (!(key.toLowerCase() in headers)) {
          headers[key.toLowerCase()] = value;
        }
      }
    }

    const session = getOrCreateSession(origin);

    return new Promise<Response>((resolve, reject) => {
      let req: http2.ClientHttp2Stream;
      try {
        req = session.request(headers);
      } catch (err) {
        // Session may have been destroyed between getOrCreate and request
        cleanupSession(origin);
        reject(err);
        return;
      }

      let responseStatus = 200;
      const responseHeaders = new Headers();
      let responseUrl = url.href;

      req.on("response", (hdrs) => {
        responseStatus = (hdrs[":status"] as number) ?? 200;
        for (const [key, value] of Object.entries(hdrs)) {
          if (key.startsWith(":")) continue;
          if (value === undefined) continue;
          const values = Array.isArray(value) ? value : [value];
          for (const v of values) {
            responseHeaders.append(key, String(v));
          }
        }

        // Track location for redirect detection
        const location = responseHeaders.get("location");
        if (location && responseStatus >= 300 && responseStatus < 400) {
          responseUrl = new URL(location, url).href;
        }
      });

      const chunks: Buffer[] = [];

      req.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on("end", () => {
        const body = Buffer.concat(chunks);
        const response = new Response(body.length > 0 ? body : null, {
          status: responseStatus,
          headers: responseHeaders,
        });
        // Set the url property to reflect the final URL (after any redirects)
        Object.defineProperty(response, "url", {
          value: responseUrl,
          writable: false,
        });
        resolve(response);
      });

      req.on("error", (err) => {
        cleanupSession(origin);
        reject(err);
      });

      // Stream the request body if present
      const body = init?.body ?? (input instanceof Request ? input.body : null);
      if (body !== null && body !== undefined) {
        if (body instanceof ReadableStream) {
          Readable.fromWeb(body as any).pipe(req);
        } else if (typeof body === "string") {
          req.end(body);
        } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
          req.end(Buffer.from(body as ArrayBuffer));
        } else {
          // For other body types (Blob, FormData, URLSearchParams), fall back
          req.end(String(body));
        }
      } else {
        req.end();
      }
    });
  };

  function close(): void {
    for (const [origin] of pool) {
      cleanupSession(origin);
    }
  }

  return Object.assign(h2fetch, { close }) as Http2Fetch;
}
