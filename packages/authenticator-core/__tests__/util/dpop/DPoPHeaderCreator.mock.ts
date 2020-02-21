import { IDpopHeaderCreator } from "../../../src/util/dpop/DpopHeaderCreator";
import URL from "url-parse";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function DpopHeaderCreatorMocks() {
  // DPoPHeaderCreator
  const DpopHeaderCreatorResponse = "someToken";

  const DpopHeaderCreatorMockFunction = jest.fn(
    async (audience: URL, method: string) => {
      return DpopHeaderCreatorResponse;
    }
  );

  const DpopHeaderCreatorMock: () => IDpopHeaderCreator = jest.fn<
    IDpopHeaderCreator,
    unknown[]
  >(() => ({
    createHeaderToken: DpopHeaderCreatorMockFunction
  }));

  return {
    DpopHeaderCreatorResponse,
    DpopHeaderCreatorMockFunction,
    DpopHeaderCreatorMock
  };
}
