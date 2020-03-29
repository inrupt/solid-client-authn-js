import ILogoutHandler from "../ILogoutHandler";

export const LogoutHandlerMock: jest.Mocked<ILogoutHandler> = {
  canHandle: jest.fn(async (localUserId: string) => true),
  handle: jest.fn(async (localUserId: string) => {
    /* Do nothing */
  })
};
