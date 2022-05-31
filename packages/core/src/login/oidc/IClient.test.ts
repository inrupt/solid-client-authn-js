/*
 * Copyright 2022 Inrupt Inc.
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

import { it, describe, expect } from "@jest/globals";
import {
  DynamicClient,
  isValidClient,
  PublicIdentifierClient,
  StaticClient,
} from "./IClient";

describe("isValidClient", () => {
  it("fails if the value passed is not an object", () => {
    expect(isValidClient(null)).toBe(false);
    expect(isValidClient(false)).toBe(false);
    expect(isValidClient("")).toBe(false);
    expect(isValidClient([])).toBe(false);
  });

  it("fails if the value passed contains unexpected keys", () => {
    expect(
      isValidClient({
        clientId: "123",
        unknownKey: true,
      })
    ).toBe(false);
  });

  it("fails if the value passed contains an unknown clientType", () => {
    expect(
      isValidClient({
        clientId: "123",
        clientType: "unknown",
      })
    ).toBe(false);
  });

  it("fails if the value passed has no clientId", () => {
    expect(
      isValidClient({
        clientType: "dynamic",
      })
    ).toBe(false);
  });

  it("fails if the value passed has a non-string clientId", () => {
    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: 1234,
      })
    ).toBe(false);
  });

  it("fails if the value passed has a non-string clientName", () => {
    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: "test",
        clientName: 1234,
      })
    ).toBe(false);
  });

  it("fails if the value passed has a non-string idTokenSignedResponseAlg", () => {
    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: "test",
        idTokenSignedResponseAlg: 1234,
      })
    ).toBe(false);
  });

  it("fails if the value passed is a solid-oidc clientType and has a non-url clientId", () => {
    expect(
      isValidClient({
        clientType: "solid-oidc",
        clientId: "not a url",
      })
    ).toBe(false);
  });

  it("fails if the value passed is a solid-oidc clientType and has a clientSecret", () => {
    expect(
      isValidClient({
        clientType: "solid-oidc",
        clientId: "https://public.client.test",
        clientSecret: "test secret",
      })
    ).toBe(false);
  });

  it("fails if the value passed is a static clientType and does not have a clientSecret", () => {
    expect(
      isValidClient({
        clientType: "static",
        clientId: "example",
      })
    ).toBe(false);
  });

  it("fails if the value passed is a dynamic clientType and does not have a clientSecret", () => {
    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: "example",
        clientExpiresAt: 0,
      })
    ).toBe(false);
  });

  it("fails if the value passed is a dynamic clientType and does not have a clientExpiresAt value", () => {
    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: "example",
        clientSecret: "secret",
      })
    ).toBe(false);

    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: "example",
        clientSecret: "secret",
        // not a number:
        clientExpiresAt: true,
      })
    ).toBe(false);

    expect(
      isValidClient({
        clientType: "dynamic",
        clientId: "example",
        clientSecret: "secret",
        // less than zero:
        clientExpiresAt: -10,
      })
    ).toBe(false);
  });

  it("correctly validates a static client", () => {
    const client: StaticClient = {
      clientId: "clientId-123",
      clientSecret: "secret-1234",
      clientType: "static",
    };

    expect(isValidClient(client)).toBe(true);
    expect(isValidClient({ ...client, clientName: "test client" })).toBe(true);
  });

  it("correctly validates a public identifier client", () => {
    const client: PublicIdentifierClient = {
      clientId: "https://public.client.test",
      clientType: "solid-oidc",
    };

    expect(isValidClient(client)).toBe(true);
  });

  it("correctly validates a dynamically registered client", () => {
    const client: DynamicClient = {
      clientType: "dynamic",
      clientId: "test-123",
      clientSecret: "abc-123",
      clientExpiresAt: 0,
    };

    expect(isValidClient(client)).toBe(true);
  });
});
