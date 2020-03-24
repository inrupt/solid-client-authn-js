import { IUrlRepresentationConverter } from "../UrlRepresenationConverter";
import URL from "url-parse";
import { RequestInfo } from "node-fetch";

export const UrlRepresentationConverterMock: jest.Mocked<IUrlRepresentationConverter> = {
  requestInfoToUrl: jest.fn((input: RequestInfo) => new URL(input as string))
};
