
export default class NotImplementedError extends Error {
  constructor (methodName: string) {
    super(`${methodName} is not implemented`)
  }
}