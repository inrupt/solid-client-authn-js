
// NOTE: There's a bug with istanbul and typescript that prevents full branch coverages
// https://github.com/gotwarlost/istanbul/issues/690
// The workaround is to put istanbul ignore on the constructor
export default class ConfigurationError extends Error {
  /* istanbul ignore next */
  constructor (message: string) {
    super(message)
  }
}
