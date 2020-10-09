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

import IJoseUtility from "../IJoseUtility";
import { ECCurve, OKPCurve, BasicParameters, JSONWebKey, JWT } from "jose";

export const JoseUtilityGenerateJwkResponse: JSONWebKey = {
  kty: "RSA",
  kid: "KzQzLcQWpJJpuFQij4eyfJOCilhjntj4G0ge_yTEmq8",
  use: "sig",
  alg: "RSA",
  e: "AQAB",
  n:
    "jPOJjT_KkduUeL4KbtmHgikhYqtOnm3NgJ2EXgCs3PU55qd27nwSJY1m6jCuOpCv6JsBquOd-7ZlDXM4tQeBDzuZ6zNbC15C8Mt3JyqLlvjcRd_0rADlqHjGaaNW706GfStQwXHbpNq8tiJFu4eOlKmeArNNozBsEmglsahK7mgvWSIbOG3lxpjYljpEWZ-GYpNiCrVRtUxtmc4kBqFMTvyo0w05FZLKnsXUEB0iKGVR8ZwryfvG-7qcs86gnQ18bmn9FfOheN5QgR1VkKM6hK81k74S96P6lFQho7JdAnYHB0KNIXiYbXXR9ur8ju4EwT3XBvJKMD5JfKVbbycJIQ",
  d:
    "aGKH0OKYS5LZjt327gcNUvjQ77i8XZol4gVFnTRU0MKPoeENtCqQad0hhXiN33N9wv7gqkUtn9eBWQemzHKFQtm58LS0zWN-ocOdN5VLkYA16U2lbqivbCgdkOhVnp6B_TrR8KE4sAsKTLxu9iW7Ex_WlFtjuOJIdw1INRzUeV_2HXrfyPou0Ldziuhpz7wqTiuCwRnr_0zowHIpMu7havKRQ-KOiQZuoqzt3Oi3Qx19DqXXSOJH2HPOGc4h3QgQorp3NI_RxmJzKN5pDy-rcJqSshuZQIuVg7E8FsqKex5nkJ4-AlqMMEd_CF09GbY4Kdjz-1r-gMkjYqG9hkqqHQ",
  p:
    "0wwLBI8jP4kTDxgNheCO_pvQ6pHLirOfDE4wMLzRp54ny3GZhu4HcnVE6ft-PjuE1zjQEsoQcT-9V8eT6VdXZserboh59NmaRTz2zc8IT3o6-fmxSLZqUhhOn2GPxDsDwzrAm0stsFR_No-w3qAodQLLgGffM1ypY48P0U-ZJl8",
  q:
    "qvlR50__vyWyMoc7PW4u7WeQzU6Y5EdzDcrNcxGluCpPQmreMSg67NnYLHDA24TA35duV84dMlPl5mu6zKYwNo9w3lHFyMFmxiWbnsrWR6JO3yQDwLvFAuOBDj1EyPKxZGqg_3VFCzNVGU6tiDRYt3dXAwi38h9B5aOhDDrzAH8",
  dp:
    "ybb2BOqGhyCNvdyAeFgUdFgbS0gEYlKiDtHgj4S5YlrwsCuo0OVK6uQY9QayN-sNYePkREErjAKfB3oy7lDTseHgAaqh3hvpronBXx6lU8mA-xHjl5r6bfLbmsxV6_l39C6Ajy1AwwtP96dJJs-vO39rYBRnqiDDqeu_84__0kM",
  dq:
    "iGLgcgv_8EQq1WHI4OUfLCRcf1o-XoOchRkNMMiYEMQ3e7zyR_ZWow_YAQNk5PgOP4516Dc0VSxWDaxMU-oSNcPQ_pfulYmp6VCgxlf5_SS9lAUPtVRUAUzoayp2z3HCDl981KuAi0HEla6MgUV4q8nYMERpMAy9LWmNE8uGgxM",
  qi:
    "uCLWDLyIVCWNdVSxdhob9TgdSUKq5GmiUjm8IDRH_hebpDIxoVwY1L2QVe50lk5iGObQJyBy5ylTHu1SxRUUUWl6IcrKp4xQRuIkAd7FO9RuowbgH26BEup36gtU5T2Qliiy7izK7Q4EX6JaXe9S7d-k7j2FqpHue9fH-KAYnuU",
};
export const JoseUtilityPrivateToPublicJwkResponse: JSONWebKey = {
  kty: "RSA",
  kid: "KzQzLcQWpJJpuFQij4eyfJOCilhjntj4G0ge_yTEmq8",
  use: "sig",
  alg: "RSA",
  e: "AQAB",
  n:
    "jPOJjT_KkduUeL4KbtmHgikhYqtOnm3NgJ2EXgCs3PU55qd27nwSJY1m6jCuOpCv6JsBquOd-7ZlDXM4tQeBDzuZ6zNbC15C8Mt3JyqLlvjcRd_0rADlqHjGaaNW706GfStQwXHbpNq8tiJFu4eOlKmeArNNozBsEmglsahK7mgvWSIbOG3lxpjYljpEWZ-GYpNiCrVRtUxtmc4kBqFMTvyo0w05FZLKnsXUEB0iKGVR8ZwryfvG-7qcs86gnQ18bmn9FfOheN5QgR1VkKM6hK81k74S96P6lFQho7JdAnYHB0KNIXiYbXXR9ur8ju4EwT3XBvJKMD5JfKVbbycJIQ",
  d:
    "aGKH0OKYS5LZjt327gcNUvjQ77i8XZol4gVFnTRU0MKPoeENtCqQad0hhXiN33N9wv7gqkUtn9eBWQemzHKFQtm58LS0zWN-ocOdN5VLkYA16U2lbqivbCgdkOhVnp6B_TrR8KE4sAsKTLxu9iW7Ex_WlFtjuOJIdw1INRzUeV_2HXrfyPou0Ldziuhpz7wqTiuCwRnr_0zowHIpMu7havKRQ-KOiQZuoqzt3Oi3Qx19DqXXSOJH2HPOGc4h3QgQorp3NI_RxmJzKN5pDy-rcJqSshuZQIuVg7E8FsqKex5nkJ4-AlqMMEd_CF09GbY4Kdjz-1r-gMkjYqG9hkqqHQ",
  p:
    "0wwLBI8jP4kTDxgNheCO_pvQ6pHLirOfDE4wMLzRp54ny3GZhu4HcnVE6ft-PjuE1zjQEsoQcT-9V8eT6VdXZserboh59NmaRTz2zc8IT3o6-fmxSLZqUhhOn2GPxDsDwzrAm0stsFR_No-w3qAodQLLgGffM1ypY48P0U-ZJl8",
  q:
    "qvlR50__vyWyMoc7PW4u7WeQzU6Y5EdzDcrNcxGluCpPQmreMSg67NnYLHDA24TA35duV84dMlPl5mu6zKYwNo9w3lHFyMFmxiWbnsrWR6JO3yQDwLvFAuOBDj1EyPKxZGqg_3VFCzNVGU6tiDRYt3dXAwi38h9B5aOhDDrzAH8",
  dp:
    "ybb2BOqGhyCNvdyAeFgUdFgbS0gEYlKiDtHgj4S5YlrwsCuo0OVK6uQY9QayN-sNYePkREErjAKfB3oy7lDTseHgAaqh3hvpronBXx6lU8mA-xHjl5r6bfLbmsxV6_l39C6Ajy1AwwtP96dJJs-vO39rYBRnqiDDqeu_84__0kM",
  dq:
    "iGLgcgv_8EQq1WHI4OUfLCRcf1o-XoOchRkNMMiYEMQ3e7zyR_ZWow_YAQNk5PgOP4516Dc0VSxWDaxMU-oSNcPQ_pfulYmp6VCgxlf5_SS9lAUPtVRUAUzoayp2z3HCDl981KuAi0HEla6MgUV4q8nYMERpMAy9LWmNE8uGgxM",
  qi:
    "uCLWDLyIVCWNdVSxdhob9TgdSUKq5GmiUjm8IDRH_hebpDIxoVwY1L2QVe50lk5iGObQJyBy5ylTHu1SxRUUUWl6IcrKp4xQRuIkAd7FO9RuowbgH26BEup36gtU5T2Qliiy7izK7Q4EX6JaXe9S7d-k7j2FqpHue9fH-KAYnuU",
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JoseUtilityDecodeJwtResponse: Record<string, any> = {
  sub: "mocked sub claim value",
};
export const JoseUtilitySignJwtResponse = "signedToken";
export const JoseUtilityGenerateCodeVerifierResponse = "codeVerifier";
export const JoseUtilityGenerateCodeChallengeResponse = "codeChallenge";

export const JoseUtilityMock: jest.Mocked<IJoseUtility> = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore Because of the complex typings in this method, an error is thrown when wrapped in "Mocked"
  generateJwk: jest.fn(
    async (
      _kty: "EC" | "OKP" | "RSA" | "oct",
      _crvBitlength?: ECCurve | OKPCurve | number,
      _parameters?: BasicParameters,
      _isPrivate?: boolean
    ) => JoseUtilityGenerateJwkResponse
  ),
  privateJwkToPublicJwk: jest.fn(
    async (_jwk: JSONWebKey) => JoseUtilityPrivateToPublicJwkResponse
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeJwt: jest.fn(async (_token: string) => JoseUtilityDecodeJwtResponse),
  signJwt: jest.fn(
    async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _payload: Record<string, any>,
      _key: JSONWebKey,
      _options?: JWT.SignOptions
    ) => JoseUtilitySignJwtResponse
  ),
  generateCodeVerifier: jest.fn(
    async () => JoseUtilityGenerateCodeVerifierResponse
  ),
  generateCodeChallenge: jest.fn(
    async (_verifier: string) => JoseUtilityGenerateCodeChallengeResponse
  ),
};
