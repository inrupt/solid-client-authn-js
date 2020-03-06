import { RequestInfo, RequestInit, Response } from "node-fetch";

/**
 * Defines the data that should be persisted
 */
// TODO: Implement
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export default interface ISolidSession {
  webId: string; // The user's webId
  state?: string; // Any state that was passed upon login
  logout: () => void; // Function to log this user out
  fetch: (url: RequestInfo, init: RequestInit) => Promise<Response>;
}
