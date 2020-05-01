/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * Error to be triggered if there is no handler that can handle certain parameters
 */
export default class HandlerNotFoundError extends Error {
  public params: string[];

  /* istanbul ignore next */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(handlerName: string, params: any[]) {
    super(
      `${handlerName} cannot find a suitable handler for: ${params
        .map(e => {
          try {
            return JSON.stringify(e);
          } catch (err) {
            return e.toString();
          }
        })
        .join(", ")}`
    );
    this.params = params;
  }
}
