import { ISessionCreator, ISessionCreatorOptions } from "../SessionCreator";
import ISolidSession from "../ISolidSession";
import { RequestInfo, RequestInit, Response } from "node-fetch";

export const SessionCreatorCreateResponse: ISolidSession = {
  localUserId: "global",
  webId: "https://pod.com/profile/card#me",
  neededAction: undefined,
  logout: async (): Promise<void> => {
    /* do nothing */
  },
  fetch: async (url: RequestInfo, init: RequestInit): Promise<Response> =>
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
