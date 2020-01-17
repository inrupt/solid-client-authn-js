/**
 * A handler is an abstract concept for execution. It knows what it can handle, and will perform
 * the action if needed
 */
export default interface IHandleable<P extends Array<any>, R> {
  canHandle (...params: P): Promise<boolean>
  handle (...params: P): Promise<R>
}
