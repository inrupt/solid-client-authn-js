import { IDpopHeaderCreator } from "../DpopHeaderCreator";

export const DpopHeaderCreatorResponse = "someToken";

export const DpopHeaderCreatorMock: jest.Mocked<IDpopHeaderCreator> = {
  createHeaderToken: jest.fn(
    async (_audience, _method) => DpopHeaderCreatorResponse
  )
};
