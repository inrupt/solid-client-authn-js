import ConfigurationError from '../../../src/util/errors/ConfigurationError'
import HandlerNotFoundError from '../../../src/util/errors/HandlerNotFoundError'
import NotImplementedError from '../../../src/util/errors/NotImplementedError'

describe('errors', () => {
  const errors: {
    name: string
    class: any,
    params: any[],
    message: string
  }[] = [
    {
      name: 'ConfigurationError',
      class: ConfigurationError,
      params: ['Bad Config'],
      message: 'Bad Config'
    },
    {
      name: 'HandlerNotFoundError',
      class: HandlerNotFoundError,
      params: ['HandlerName', [1, 2]],
      message: 'HandlerName cannot find a suitable handler for: 1, 2'
    },
    {
      name: 'NotImplementedError',
      class: NotImplementedError,
      params: ['FunctionName'],
      message: 'FunctionName is not implemented'
    }
  ]

  errors.forEach((err) => {
    it(`Should throw ${err.name}`, () => {
      expect(() => {
        const error = new err.class(...err.params)
        throw error
      }).toThrowError(err.message)
    })
  })
})
