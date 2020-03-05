/**
 * A wrapper method to wrap the standard w3 fetch library
 */
import fetch from "cross-fetch";
import URL from "url-parse";

export interface IFetcher {
  fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export default class Fetcher implements IFetcher {
  async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(url.toString(), init);
  }
}
