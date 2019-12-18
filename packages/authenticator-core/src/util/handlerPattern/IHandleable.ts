
export default interface IHandleable<P extends Array<any>, R> {
  canHandle (...params: P): Promise<boolean>
  handle (...params: P): Promise<R>
}
