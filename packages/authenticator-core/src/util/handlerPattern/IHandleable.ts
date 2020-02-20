/**
 * A handler is an abstract concept for execution. It knows what it can handle, and will perform
 * the action if needed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default interface IHandleable<P extends Array<any>, R> {
  canHandle(...params: P): Promise<boolean>;
  handle(...params: P): Promise<R>;
}
