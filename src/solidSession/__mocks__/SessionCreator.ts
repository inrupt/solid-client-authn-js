import { ISessionCreator, ISessionCreatorOptions } from "../SessionCreator";
import ISolidSession, { ILoggedInSolidSession } from "../ISolidSession";

export const SessionCreatorCreateResponse: ILoggedInSolidSession = {
  localUserId: "global",
  loggedIn: true,
  webId: "https://pod.com/profile/card#me",
  neededAction: { actionType: "inaction" },
  logout: async (): Promise<void> => {
    /* do nothing */
  },
  fetch: async (url: RequestInfo, init?: RequestInit): Promise<Response> =>
    new Response()
};
export const SessionCreatorGetSessionResponse: ISolidSession = SessionCreatorCreateResponse;

export const SessionCreatorMock: jest.Mocked<ISessionCreator> = {
  create: jest.fn(
    (options: ISessionCreatorOptions) => SessionCreatorCreateResponse
  ),
  getSession: jest.fn(
    async (localUserId: string) => SessionCreatorGetSessionResponse
  )
};
