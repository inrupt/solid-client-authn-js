import { ITokenSaver } from "../TokenSaver";
import { SessionCreatorCreateResponse } from "../../../../solidSession/__mocks__/SessionCreator";

export const TokenSaverSaveTokenAndGetSessionResponse = SessionCreatorCreateResponse;

export const TokenSaverMock: jest.Mocked<ITokenSaver> = {
  saveTokenAndGetSession: jest.fn(
    (localUserId: string, idToken: string, accessToken?: string) =>
      Promise.resolve(TokenSaverSaveTokenAndGetSessionResponse)
  )
};
