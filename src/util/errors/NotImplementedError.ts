/**
 * Error to be triggered if a method is not implemented
 */
export default class NotImplementedError extends Error {
  /* istanbul ignore next */
  constructor(methodName: string) {
    super(`${methodName} is not implemented`);
  }
}
