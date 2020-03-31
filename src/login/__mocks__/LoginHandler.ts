import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import ISolidSession from "../../solidSession/ISolidSession";
import { SessionCreatorCreateResponse } from "../../solidSession/__mocks__/SessionCreator";

export const LoginHandlerResponse: ISolidSession = SessionCreatorCreateResponse;

export const LoginHandlerMock: jest.Mocked<ILoginHandler> = {
  canHandle: jest.fn((options: ILoginOptions) => Promise.resolve(true)),
  handle: jest.fn((options: ILoginOptions) =>
    Promise.resolve(LoginHandlerResponse)
  )
};
