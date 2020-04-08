import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import ISolidSession from "../../solidSession/ISolidSession";
import { SessionCreatorCreateResponse } from "../../solidSession/__mocks__/SessionCreator";
import INeededRedirectAction from "../../solidSession/INeededRedirectAction";

export const LoginHandlerResponse: ISolidSession = {
  loggedIn: true,
  localUserId: "global",
  neededAction: {
    actionType: "redirect",
    redirectUrl: "http://coolSite.com/redirect"
  } as INeededRedirectAction,
  logout: SessionCreatorCreateResponse.logout,
  fetch: SessionCreatorCreateResponse.fetch
};

export const LoginHandlerMock: jest.Mocked<ILoginHandler> = {
  canHandle: jest.fn((options: ILoginOptions) => Promise.resolve(true)),
  handle: jest.fn((options: ILoginOptions) =>
    Promise.resolve(LoginHandlerResponse)
  )
};
