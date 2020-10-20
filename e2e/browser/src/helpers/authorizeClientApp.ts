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

import { Selector, t } from "testcafe";

export async function authorizeNss(): Promise<void> {
  // Authorize our client application to access Pod resources. On NSS this will
  // only be required the first time this app is seen at the Pod. So we need a
  // conditional check here.
  const authorizeButtonExists = await Selector("[name=consent]").exists;
  if (authorizeButtonExists) {
    // Click here to grant Control access to our app. Only certain apps may need
    // that level of access, so don't provide by default.
    // await t.click("#control");

    await t.click("[name=consent]");
  }
}

export async function authorizeEss(): Promise<void> {
  await t.click("[name=authorize]");
}
