import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch'

export interface IFetcher {
  fetch (url: RequestInfo, init?: RequestInit): Promise<Response>
}

export default class Fetcher implements IFetcher {
  async fetch (url: RequestInfo, init?: RequestInit): Promise<Response> {
    return fetch(url, init)
  }
}
