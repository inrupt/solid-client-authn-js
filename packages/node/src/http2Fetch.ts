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

import { Agent, fetch as undiciFetch } from "undici";
import type tls from "node:tls";

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
 * @param options.tlsOptions TLS options forwarded to the underlying connection.
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
  const keepAliveTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT_MS;

  function createAgent(): Agent {
    return new Agent({
      allowH2: true,
      keepAliveTimeout,
      connect: options.tlsOptions,
    });
  }

  let agent = createAgent();

  const h2fetch: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    return undiciFetch(
      input as Parameters<typeof undiciFetch>[0],
      { ...init, dispatcher: agent } as Parameters<typeof undiciFetch>[1],
    ) as unknown as Promise<Response>;
  };

  function close(): void {
    agent.close();
    agent = createAgent();
  }

  return Object.assign(h2fetch, { close }) as Http2Fetch;
}
