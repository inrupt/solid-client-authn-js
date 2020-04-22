import INeededAction from "./INeededAction";

/**
 * Defines the data that should be persisted
 */
type ISolidSession = ILoggedInSolidSession | ILoggedOutSolidSession;
export default ISolidSession;

export interface ICoreSolidSession {
  localUserId: string;
  neededAction: INeededAction;
}

export interface ILoggedInSolidSession extends ICoreSolidSession {
  loggedIn: true;
  webId: string;
  state: string;
  logout: () => Promise<void>;
  fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
}

export interface ILoggedOutSolidSession extends ICoreSolidSession {
  loggedIn: false;
}
