/**
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
import { config } from "dotenv-flow";

config({
  path: __dirname.concat("/../env/"),
  // Disable warning messages in CI
  silent: process.env.CI === "true",
});

const availableEnvironment = [
  "ESS Dev-Next" as const,
  "ESS Production" as const,
  "ESS 1.1" as const,
  "NSS" as const,
];

export type AvailableEnvironment = typeof availableEnvironment extends Array<
  infer E
>
  ? E
  : never;

export interface TestingEnvironment {
  clientId: string;
  clientSecret: string;
  environment: AvailableEnvironment;
  // No environment-specific features at the moment
  // feature: {}
  idp: string;
  pod: string;
}

export interface EnvVariables {
  E2E_TEST_ENVIRONMENT: AvailableEnvironment;
  E2E_TEST_POD: string;
  E2E_TEST_IDP: string;
  E2E_TEST_CLIENT_ID: string;
  E2E_TEST_CLIENT_SECRET: string;
}

function isTestingEnvironment(
  environment: unknown
): asserts environment is EnvVariables {
  if (
    !availableEnvironment.includes(
      (environment as EnvVariables).E2E_TEST_ENVIRONMENT as AvailableEnvironment
    )
  ) {
    throw new Error(
      `Unknown environment: [${
        (environment as EnvVariables).E2E_TEST_ENVIRONMENT
      }]`
    );
  }
  if (typeof (environment as EnvVariables).E2E_TEST_POD !== "string") {
    throw new Error("The environment variable E2E_TEST_POD is undefined.");
  }
  if (typeof (environment as EnvVariables).E2E_TEST_IDP !== "string") {
    throw new Error("The environment variable E2E_TEST_IDP is undefined.");
  }
  if (typeof (environment as EnvVariables).E2E_TEST_CLIENT_ID !== "string") {
    throw new Error(
      "The environment variable E2E_TEST_CLIENT_ID is undefined."
    );
  }
  if (
    typeof (environment as EnvVariables).E2E_TEST_CLIENT_SECRET !== "string"
  ) {
    throw new Error(
      "The environment variable E2E_TEST_CLIENT_SECRET is undefined."
    );
  }
}

export function getTestingEnvironment(): TestingEnvironment {
  isTestingEnvironment(process.env);

  return {
    pod: process.env.E2E_TEST_POD,
    idp: process.env.E2E_TEST_IDP,
    clientId: process.env.E2E_TEST_CLIENT_ID,
    clientSecret: process.env.E2E_TEST_CLIENT_SECRET,
    environment: process.env.E2E_TEST_ENVIRONMENT,
    // feature: {}
  };
}
