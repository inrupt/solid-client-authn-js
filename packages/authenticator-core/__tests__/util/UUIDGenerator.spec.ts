import UUIDGenerator from '../../src/util/UUIDGenerator'

jest.mock('uuid')

describe('UUIDGenerator', () => {
  it('should simply wrap the `uuid` module', () => {
    const uuidMock: { v4: jest.Mock } = require.requireMock('uuid');
    uuidMock.v4.mockReturnValueOnce('some uuid')

    const generator = new UUIDGenerator();
    expect(generator.v4()).toBe('some uuid')
  })
});
