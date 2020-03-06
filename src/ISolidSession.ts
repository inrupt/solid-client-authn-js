import { RequestInfo, RequestInit, Response } from "node-fetch";

/**
 * Defines the data that should be persisted
 */
export default interface ISolidSession {
  webId: string;
  state?: string;
  logout: () => void;
  fetch: (url: RequestInfo, init: RequestInit) => Promise<Response>;
}
