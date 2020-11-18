/*
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

import {
  IClient,
  IClientRegistrar,
  IClientRegistrarOptions,
  IIssuerConfig,
} from "@inrupt/solid-client-authn-core";
import { ClientMetadata } from "openid-client";

export const ClientRegistrarResponse: IClient = {
  clientId: "abcde",
  clientSecret: "12345",
};

export const PublicClientRegistrarResponse: IClient = {
  clientId: "abcde",
};

export const ClientRegistrarMock: jest.Mocked<IClientRegistrar> = {
  getClient: jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (options: IClientRegistrarOptions, issuerConfig: IIssuerConfig) =>
      Promise.resolve(ClientRegistrarResponse)
  ),
};

export const PublicClientRegistrarMock: jest.Mocked<IClientRegistrar> = {
  getClient: jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (options: IClientRegistrarOptions, issuerConfig: IIssuerConfig) =>
      Promise.resolve(PublicClientRegistrarResponse)
  ),
};

export const mockDefaultClientConfig = (): ClientMetadata => {
  return {
    client_id: "some client",
    client_secret: "some secret",
    redirect_uris: ["https://my.app/redirect"],
    response_types: ["code"],
  };
};

export const mockClientConfig = (
  config: Record<string, string | undefined>
): ClientMetadata => {
  return {
    ...mockDefaultClientConfig(),
    ...config,
  };
};

export const mockDefaultClient = (): IClient => {
  return {
    clientId: "a client id",
    clientSecret: "a client secret",
  };
};

export const mockDefaultClientRegistrar = (): IClientRegistrar => {
  return {
    getClient: async () => mockDefaultClient(),
  };
};

export const mockClientRegistrar = (client: IClient): IClientRegistrar => {
  return {
    getClient: async () => client,
  };
};
