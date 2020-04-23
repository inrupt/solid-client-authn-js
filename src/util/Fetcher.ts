/**
 * A wrapper method to wrap the standard w3 fetch library
 */
import URL from "url-parse";
import _fetch from "cross-fetch";

export interface IFetcher {
  fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export default class Fetcher implements IFetcher {
  async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const fetchUrl = url instanceof URL ? url.toString() : url;
    return _fetch(fetchUrl, init);
  }
}
