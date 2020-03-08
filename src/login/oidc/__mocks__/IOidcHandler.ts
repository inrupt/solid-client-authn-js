import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";

export const MockOidcHandler: jest.Mocked<IOidcHandler> = {
  canHandle: jest.fn((_options: IOidcOptions) => Promise.resolve(true)),
  handle: jest.fn((_options: IOidcOptions) =>
    Promise.resolve("https://coolsite.com/redirect")
  )
};
