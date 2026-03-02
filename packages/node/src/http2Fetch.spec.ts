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

import { describe, it, expect, afterEach } from "@jest/globals";
import http2 from "node:http2";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createHttp2Fetch } from "./http2Fetch";
import type { Http2Fetch } from "./http2Fetch";

// Generate self-signed certs for testing
function generateSelfSignedCert(): { key: Buffer; cert: Buffer } {
  const tmpDir = fs.mkdtempSync("/tmp/h2test-");
  execSync(
    `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -keyout ${tmpDir}/key.pem -out ${tmpDir}/cert.pem -days 1 -nodes -subj "/CN=localhost" 2>/dev/null`,
  );
  return {
    key: fs.readFileSync(path.join(tmpDir, "key.pem")),
    cert: fs.readFileSync(path.join(tmpDir, "cert.pem")),
  };
}

let server: http2.Http2SecureServer;
let serverPort: number;
let h2fetch: Http2Fetch;

const certs = generateSelfSignedCert();

function createTestServer(
  handler: (
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders,
  ) => void,
): Promise<number> {
  return new Promise((resolve) => {
    server = http2.createSecureServer({
      key: certs.key,
      cert: certs.cert,
    });
    server.on("stream", handler);
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve(addr.port);
      }
    });
  });
}

const testTlsOptions = { rejectUnauthorized: false };

afterEach(async () => {
  if (h2fetch) {
    h2fetch.close();
  }
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe("createHttp2Fetch", () => {
  it("returns a function with a close method", () => {
    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    expect(typeof h2fetch).toBe("function");
    expect(typeof h2fetch.close).toBe("function");
  });

  it("makes a successful GET request over HTTP/2", async () => {
    serverPort = await createTestServer((stream, headers) => {
      stream.respond({
        ":status": 200,
        "content-type": "text/plain",
      });
      stream.end("hello from h2");
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    const response = await h2fetch(`https://localhost:${serverPort}/test`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    const body = await response.text();
    expect(body).toBe("hello from h2");
  });

  it("sends correct method and path", async () => {
    let receivedHeaders: http2.IncomingHttpHeaders = {};

    serverPort = await createTestServer((stream, headers) => {
      receivedHeaders = headers;
      stream.respond({ ":status": 204 });
      stream.end();
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    await h2fetch(`https://localhost:${serverPort}/resource?q=test`, {
      method: "POST",
    });

    expect(receivedHeaders[":method"]).toBe("POST");
    expect(receivedHeaders[":path"]).toBe("/resource?q=test");
  });

  it("sends custom headers", async () => {
    let receivedHeaders: http2.IncomingHttpHeaders = {};

    serverPort = await createTestServer((stream, headers) => {
      receivedHeaders = headers;
      stream.respond({ ":status": 200 });
      stream.end();
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    await h2fetch(`https://localhost:${serverPort}/`, {
      headers: {
        Authorization: "Bearer token123",
        "X-Custom": "value",
      },
    });

    expect(receivedHeaders.authorization).toBe("Bearer token123");
    expect(receivedHeaders["x-custom"]).toBe("value");
  });

  it("sends request body", async () => {
    let receivedBody = "";

    serverPort = await createTestServer((stream) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        receivedBody = Buffer.concat(chunks).toString();
        stream.respond({ ":status": 200 });
        stream.end();
      });
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    await h2fetch(`https://localhost:${serverPort}/`, {
      method: "PUT",
      body: '{"key": "value"}',
    });

    expect(receivedBody).toBe('{"key": "value"}');
  });

  it("reuses connections for same origin (multiplexing)", async () => {
    let requestCount = 0;

    serverPort = await createTestServer((stream) => {
      requestCount++;
      stream.respond({ ":status": 200 });
      stream.end(`response ${requestCount}`);
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });

    // Issue multiple requests in parallel to the same origin
    const responses = await Promise.all([
      h2fetch(`https://localhost:${serverPort}/a`),
      h2fetch(`https://localhost:${serverPort}/b`),
      h2fetch(`https://localhost:${serverPort}/c`),
    ]);

    expect(responses).toHaveLength(3);
    for (const resp of responses) {
      expect(resp.status).toBe(200);
    }
    expect(requestCount).toBe(3);
  });

  it("handles server errors", async () => {
    serverPort = await createTestServer((stream) => {
      stream.respond({ ":status": 500 });
      stream.end("Internal Server Error");
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    const response = await h2fetch(`https://localhost:${serverPort}/fail`);

    expect(response.status).toBe(500);
    expect(response.ok).toBe(false);
  });

  it("close() shuts down all sessions", async () => {
    serverPort = await createTestServer((stream) => {
      stream.respond({ ":status": 200 });
      stream.end("ok");
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    await h2fetch(`https://localhost:${serverPort}/test`);

    // Should not throw
    h2fetch.close();

    // After close, new requests should create new connections
    const response = await h2fetch(`https://localhost:${serverPort}/test2`);
    expect(response.status).toBe(200);
  });

  it("sets the response url property", async () => {
    serverPort = await createTestServer((stream) => {
      stream.respond({ ":status": 200 });
      stream.end();
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    const response = await h2fetch(
      `https://localhost:${serverPort}/my/resource`,
    );

    expect(response.url).toBe(
      `https://localhost:${serverPort}/my/resource`,
    );
  });

  it("accepts URL objects as input", async () => {
    serverPort = await createTestServer((stream) => {
      stream.respond({ ":status": 200 });
      stream.end("ok");
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    const url = new URL(`https://localhost:${serverPort}/test`);
    const response = await h2fetch(url);
    expect(response.status).toBe(200);
  });

  it("accepts Headers object in init", async () => {
    let receivedHeaders: http2.IncomingHttpHeaders = {};

    serverPort = await createTestServer((stream, headers) => {
      receivedHeaders = headers;
      stream.respond({ ":status": 200 });
      stream.end();
    });

    h2fetch = createHttp2Fetch({ tlsOptions: testTlsOptions });
    const headers = new Headers();
    headers.set("Accept", "application/json");
    await h2fetch(`https://localhost:${serverPort}/`, { headers });

    expect(receivedHeaders.accept).toBe("application/json");
  });
});
