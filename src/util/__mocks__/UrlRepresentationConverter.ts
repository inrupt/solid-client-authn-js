import { IUrlRepresentationConverter } from "../UrlRepresenationConverter";
import URL from "url-parse";

export const UrlRepresentationConverterMock: jest.Mocked<IUrlRepresentationConverter> = {
  requestInfoToUrl: jest.fn((input: RequestInfo) => new URL(input as string))
};
