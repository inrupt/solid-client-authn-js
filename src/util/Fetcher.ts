/**
 * A wrapper method to wrap the standard w3 fetch library
 */
import URL from "url-parse";
import { RequestInfo, RequestInit, Response } from "node-fetch";

export interface IFetcher {
  fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export default class Fetcher implements IFetcher {
  async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    throw new Error("Fetch not implemented");
  }
}
