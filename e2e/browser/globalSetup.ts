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
import { getTestingEnvironment } from "../setup/e2e-setup";

async function globalSetup() {
  // Fail fast with dotenv:
  getTestingEnvironment();

<<<<<<< HEAD:e2e/browser/globalSetup.ts
  // Return the teardown function.
  return async () => {};
=======
/**
 * Responsible for decided which Login Handler should be used given the Login Options
 */
import {
  ILoginHandler,
  ILoginOptions,
  AggregateHandler,
  LoginResult,
} from "@rubensworks/solid-client-authn-core";

/**
 * @hidden
 */
export default class AggregateLoginHandler
  extends AggregateHandler<[ILoginOptions], LoginResult>
  implements ILoginHandler
{
  constructor(loginHandlers: ILoginHandler[]) {
    super(loginHandlers);
  }
>>>>>>> 6df43277 (Prepare repo for fork publication):packages/browser/src/login/AggregateLoginHandler.ts
}
export default globalSetup;
