import { IDPoPHeaderCreator } from "../../../src/util/dpop/DPoPHeaderCreator";
import URL from "url-parse";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function DPoPHeaderCreatorMocks() {
  // DPoPHeaderCreator
  const DPoPHeaderCreatorResponse = "someToken";

  const DPoPHeaderCreatorMockFunction = jest.fn(
    async (audience: URL, method: string) => {
      return DPoPHeaderCreatorResponse;
    }
  );

  const DPoPHeaderCreatorMock: () => IDPoPHeaderCreator = jest.fn<
    IDPoPHeaderCreator,
    unknown[]
  >(() => ({
    createHeaderToken: DPoPHeaderCreatorMockFunction
  }));

  return {
    DPoPHeaderCreatorResponse,
    DPoPHeaderCreatorMockFunction,
    DPoPHeaderCreatorMock
  };
}
