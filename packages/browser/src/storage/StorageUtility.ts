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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * A helper class that will validate items taken from local storage
 */
import { injectable, inject } from "tsyringe";
import { IStorage, StorageUtility } from "@inrupt/solid-client-authn-core";

/**
 * This class in a no-value-added extension of StorageUtility from the core module.
 * The reason it has to be declared is for TSyringe to find the decorators in the
 * same modules as where the dependency container is declared (in this case,
 * the browser module, with the dependancy container in dependencies.ts).
 * @hidden
 */
@injectable()
export default class StorageUtilityBrowser extends StorageUtility {
  constructor(
    @inject("secureStorage") secureStorage: IStorage,
    @inject("insecureStorage") insecureStorage: IStorage
  ) {
    super(secureStorage, insecureStorage);
  }
}
