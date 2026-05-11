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

import type { CryptoKey } from "jose";
import type { KeyObject } from "node:crypto";

// FIXME: Remove this helper when openid-client is upgraded to v6.
// openid-client v5's DPoPInput type is `KeyObject | Parameters<crypto.createPrivateKey>[0]`,
// but at runtime it also accepts a Web Crypto `CryptoKey` (verified via the
// `Symbol.toStringTag === 'CryptoKey'` check in its `dpopProof` method).
// jose v6's `generateKeyPair` returns a `CryptoKey`, so we need to bridge the
// type mismatch. openid-client v6 uses jose v6 natively and accepts `CryptoKey`
// directly, so this helper becomes unnecessary after that upgrade.
export const asDPoPInput = (key: CryptoKey): KeyObject =>
  key as unknown as KeyObject;
