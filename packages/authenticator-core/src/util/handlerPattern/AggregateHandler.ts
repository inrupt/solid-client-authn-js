import IHandleable from './IHandleable'

export default class AggregateHandler<P extends Array<any>, R> implements IHandleable<P, R> {
  constructor (
    private handleables: IHandleable<P, R>[]
  ) {}

  /**
   * Helper function that will asynchronously determine the proper handler to use. If multiple
   * handlers can handle, it will choose the first one in the list
   * @param params Paramerters to feed to the handler
   */
  private async getProperHandler (params: P): Promise<IHandleable<P, R> | null> {
    return new Promise<IHandleable<P, R> | null>((resolve, reject) => {
      const resolvedValues: Array<boolean | null> = Array(this.handleables.length).map(() => null)
      let numberResolved = 0
      this.handleables.forEach(async (handleable: IHandleable<P, R>, index: number) => {
        resolvedValues[index] = await handleable.canHandle(...params)
        numberResolved++
        let curResolvedValueIndex = 0
        while (
          resolvedValues[curResolvedValueIndex] !== null ||
          resolvedValues[curResolvedValueIndex] !== undefined
        ) {
          if (resolvedValues[curResolvedValueIndex]) {
            resolve(this.handleables[curResolvedValueIndex])
          }
          curResolvedValueIndex++
        }
      })
    })
  }

  async canHandle (...params: P): Promise<boolean> {
    return (await this.getProperHandler(params)) !== null
  }

  async handle (...params: P): Promise<R> {
    const handler = await this.getProperHandler(params)
    if (handler) {
      return this.handle(...params)
    } else {
      // TODO: more specific error naming
      throw new Error('Cannot Handle')
    }
  }
}
