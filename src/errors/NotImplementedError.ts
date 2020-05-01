/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * Error to be triggered if a method is not implemented
 */
export default class NotImplementedError extends Error {
  /* istanbul ignore next */
  constructor(methodName: string) {
    super(`${methodName} is not implemented`);
  }
}
