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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * An abstract class that will select the first handler that can handle certain parameters
 */
import { IHandleable } from "@inrupt/solid-client-authn-core";
import HandlerNotFoundError from "../../errors/HandlerNotFoundError";

/**
 * @hidden
 */
export default class AggregateHandler<P extends Array<unknown>, R>
  implements IHandleable<P, R> {
  constructor(private handleables: IHandleable<P, R>[]) {}

  /**
   * Helper function that will asynchronously determine the proper handler to use. If multiple
   * handlers can handle, it will choose the first one in the list
   * @param params Paramerters to feed to the handler
   */
  private async getProperHandler(params: P): Promise<IHandleable<P, R> | null> {
    // TODO : This function doesn't currently operate as described. Tests need to be written

    // return new Promise<IHandleable<P, R> | null>((resolve, reject) => {
    //  const resolvedValues: Array<boolean | null> = Array(this.handleables.length).map(() => null)
    //   let numberResolved = 0
    //   this.handleables.forEach(async (handleable: IHandleable<P, R>, index: number) => {
    //     resolvedValues[index] = await handleable.canHandle(...params)
    //     numberResolved++
    //     let curResolvedValueIndex = 0
    //     while (
    //       resolvedValues[curResolvedValueIndex] !== null ||
    //       resolvedValues[curResolvedValueIndex] !== undefined
    //     ) {
    //       if (resolvedValues[curResolvedValueIndex]) {
    //         resolve(this.handleables[curResolvedValueIndex])
    //       }
    //       curResolvedValueIndex++
    //     }
    //   })
    // })

    let rightOne: IHandleable<P, R> | null = null;
    for (let i = 0; i < this.handleables.length; i++) {
      const canHandle = await this.handleables[i].canHandle(...params);
      if (canHandle) {
        rightOne = this.handleables[i];
        break;
      }
    }
    return rightOne;
  }

  async canHandle(...params: P): Promise<boolean> {
    return (await this.getProperHandler(params)) !== null;
  }

  async handle(...params: P): Promise<R> {
    const handler = await this.getProperHandler(params);
    if (handler) {
      return handler.handle(...params);
    } else {
      throw new HandlerNotFoundError(this.constructor.name, params);
    }
  }
}
