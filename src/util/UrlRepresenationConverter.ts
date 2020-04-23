import URL from "url-parse";

export interface IUrlRepresentationConverter {
  requestInfoToUrl(requestInfo: RequestInfo): URL;
}

export default class UrlRepresentationConverter {
  requestInfoToUrl(requestInfo: RequestInfo): URL {
    // TODO: parse out other ways that request info could be converted
    return new URL(requestInfo as string);
  }
}
