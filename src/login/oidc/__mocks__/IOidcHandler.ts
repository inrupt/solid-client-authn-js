import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import ISolidSession from "../../../solidSession/ISolidSession";
import { SessionCreatorGetSessionResponse } from "../../../solidSession/__mocks__/SessionCreator";

export const OidcHandlerHandleResponse: ISolidSession = SessionCreatorGetSessionResponse;

export const OidcHandlerMock: jest.Mocked<IOidcHandler> = {
  canHandle: jest.fn((_options: IOidcOptions) => Promise.resolve(true)),
  handle: jest.fn((_options: IOidcOptions) =>
    Promise.resolve(OidcHandlerHandleResponse)
  )
};
