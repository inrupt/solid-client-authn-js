/**
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

import { IFetcher } from "../Fetcher";
import { Response as NodeResponse } from "node-fetch";

export const FetcherMockResponse: Response = (new NodeResponse(
  JSON.stringify({ arbitrary: "response" })
) as unknown) as Response;

// NOTE: This are the raw JWT values
// header: {
//  "typ": "JWT",
//  "alg": "HS256"
// }
// payload: {
//   "sub": "https://some.pod/webid#me"
// }

export const FetchTokenResponse: Response = (new NodeResponse(
  JSON.stringify({
    /* eslint-disable @typescript-eslint/camelcase */
    access_token:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJodHRwczovL3NvbWUucG9kL3dlYmlkI21lIiwianRpIjoiMjFiNDhlOTgtNzA4YS00Y2UzLTk2NmMtYTk2M2UwMDM2ZDBiIiwiaWF0IjoxNTk1ODQxODAxLCJleHAiOjE1OTU4NDU0MDF9.MGqDiny3pzhlSOJ52cJWJA84J47b9p5kkuuJVPB-dVg",
    id_token: "myIdToken",
    refresh_token: "myResfreshToken",
    /* eslint-disable @typescript-eslint/camelcase */
  })
) as unknown) as Response;

export const FetcherMock: jest.Mocked<IFetcher> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetch: jest.fn(async (_url, _init) => FetcherMockResponse),
};

export const FetcherTokenMock: jest.Mocked<IFetcher> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetch: jest.fn(async (_url, _init) => FetchTokenResponse),
};
