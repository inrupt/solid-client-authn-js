import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import { ILoggedOutSolidSession } from "../../solidSession/ISolidSession";
import { SessionCreatorCreateResponse } from "../../solidSession/__mocks__/SessionCreator";
import INeededRedirectAction from "../../solidSession/INeededRedirectAction";

export const LoginHandlerResponse: ILoggedOutSolidSession = {
  loggedIn: false,
  localUserId: "global",
  neededAction: {
    actionType: "redirect",
    redirectUrl: "http://coolSite.com/redirect"
  } as INeededRedirectAction
};

export const LoginHandlerMock: jest.Mocked<ILoginHandler> = {
  canHandle: jest.fn((options: ILoginOptions) => Promise.resolve(true)),
  handle: jest.fn((options: ILoginOptions) =>
    Promise.resolve(LoginHandlerResponse)
  )
};
