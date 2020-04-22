import { IRedirector, IRedirectorOptions } from "../Redirector";
import INeededAction from "../../../solidSession/INeededAction";
import INeededRedirectAction from "../../../solidSession/INeededRedirectAction";

export const RedirectorResponse: INeededAction = {
  actionType: "redirect",
  redirectUrl: "https://coolSite.com"
} as INeededRedirectAction;

export const RedirectorMock: jest.Mocked<IRedirector> = {
  redirect: jest.fn(
    (redirctUrl: string, redirectOptions: IRedirectorOptions) =>
      RedirectorResponse
  )
};
