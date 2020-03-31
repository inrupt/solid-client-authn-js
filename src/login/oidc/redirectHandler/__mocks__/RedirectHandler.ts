import IRedirectHandler from "../IRedirectHandler";
import ISolidSession from "../../../../solidSession/ISolidSession";
import { SessionCreatorCreateResponse } from "../../../../solidSession/__mocks__/SessionCreator";

export const RedirectHandlerResponse: ISolidSession = SessionCreatorCreateResponse;

export const RedirectHandlerMock: jest.Mocked<IRedirectHandler> = {
  canHandle: jest.fn((url: string) => Promise.resolve(true)),
  handle: jest.fn((url: string) => Promise.resolve(RedirectHandlerResponse))
};
