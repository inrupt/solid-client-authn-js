import { RequestInfo, RequestInit, Response } from "node-fetch";
import INeededAction from "./INeededAction";

/**
 * Defines the data that should be persisted
 */
export default interface ISolidSession {
  localUserId: string;
  webId?: string;
  state?: string;
  neededAction?: INeededAction;
  logout: () => Promise<void>;
  fetch: (url: RequestInfo, init: RequestInit) => Promise<Response>;
}
