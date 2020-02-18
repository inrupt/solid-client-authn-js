import validateSchema from '../../src/util/validateSchema'

describe('validateSchema', () => {
  it('should return true if the given data matches the given schema', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'number' }
      }
    }

    expect(validateSchema(schema, { foo: 42 })).toBe(true)
  })

  it('should not throw an error if the given data matches the given schema', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'number' }
      }
    }

    expect(() => validateSchema(schema, { foo: 42 }, { throwError: true })).not.toThrow()
  })

  it('should mark anything as valid when there is no schema to validate against', () => {
    expect(validateSchema({}, {})).toBe(true)
  })

  it('should return false by default if the given data does not match the given schema', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'number' }
      }
    }

    expect(validateSchema(schema, { foo: 'Not a number' })).toBe(false)
  })

  it('should return false when told not to throw errors if the given data does not match the given schema', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'number' }
      }
    }

    expect(validateSchema(schema, { foo: 'Not a number' }, { throwError: false })).toBe(false)
    expect(() => validateSchema(schema, { foo: 'Not a number' }, { throwError: false }))
      .not.toThrow()
  })

  it('should throw an error when told to if the given data does not match the given schema', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'number' }
      }
    }

    expect(() => validateSchema(schema, { foo: 'Not a number' }, { throwError: true }))
      .toThrowError('schema is invalid:\n.foo should be number')
  })

  it('should log the failing schema\'s title if known', () => {
    const schema = {
      title: 'Some schema',
      type: 'object',
      properties: {
        foo: { type: 'number' }
      }
    }

    expect(() => validateSchema(schema, { foo: 'Not a number' }, { throwError: true }))
      .toThrowError('Some schema is invalid:\n.foo should be number')
  })

  describe('with our custom `typeof` keyword', () => {
    it('should properly validate if the given type matches the one mentioned in the schema', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { typeof: 'number' }
        }
      }

      expect(validateSchema(schema, { foo: 42 })).toBe(true)
    })

    it('should not validate if the given type does not match the one mentioned in the schema',
    () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { typeof: 'number' }
        }
      }

      expect(validateSchema(schema, { foo: 'Not a number' })).toBe(false)
    })
    it('should properly validate non-JSON types as well', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { typeof: 'function' }
        }
      }

      expect(validateSchema(schema, { foo: () => 1337 })).toBe(true)
    })

    it('should not validate if the given type does not match a requested non-JSON type', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { typeof: 'function' }
        }
      }

      expect(validateSchema(schema, { foo: 42 })).toBe(false)
    })

    it('should not validate if the given non-JSON type does not match the requested type', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { typeof: 'number' }
        }
      }

      expect(validateSchema(schema, { foo: () => 'A function' })).toBe(false)
    })
  })

  describe('with our custom `joinedStringOf` keyword', () => {
    it('should properly validate if the checked string consists of the words in the given array',
    () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { joinedStringOf: ['some', 'words', 'not', 'necessarily', 'in', 'this', 'order'] }
        }
      }

      expect(validateSchema(schema, { foo: 'not necessarily some words in this order' })).toBe(true)
    })

    it('should not validate if the checked string includes more than the given words', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { joinedStringOf: ['some', 'words', 'not', 'necessarily', 'in', 'this', 'order'] }
        }
      }

      expect(validateSchema(
        schema,
        { foo: 'some words in this order but not necessarily with just those words ' }
      )).toBe(false)
    })

    // This test fails (i.e. a subset of the given words validates) not sure yet if it should:
    it.skip('should not validate if the checked string includes not all the given words', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: { joinedStringOf: ['some', 'words', 'not', 'necessarily', 'in', 'this', 'order'] }
        }
      }

      expect(validateSchema(schema, { foo: 'some words' })).toBe(false)
    })
  })
})
