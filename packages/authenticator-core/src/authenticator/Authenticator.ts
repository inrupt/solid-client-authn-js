/**
 * The main class exposing Authenticator's API to the consumer
 */
import { EventEmitter } from "events";
import ISolidSession from "./ISolidSession";
import { injectable, inject } from "tsyringe";
import IStorage from "./IStorage";
import IAuthenticatedFetcher from "../authenticatedFetch/IAuthenticatedFetcher";
import URL from "url-parse";
import ILoginHandler from "../login/ILoginHandler";
import ILoginOptions from "../login/ILoginOptions";
import IDpopRequestCredentials from "../util/dpop/IDpopRequestCredentials";

@injectable()
export default class Authenticator extends EventEmitter {
  constructor(
    @inject("storage") private readonly storage: IStorage,
    @inject("authenticatedFetcher")
    private readonly authenticatedFetcher: IAuthenticatedFetcher,
    @inject("loginHandler") private readonly loginHandler: ILoginHandler
  ) {
    super();
  }

  /**
   * Allows a callback to be inserted
   * @param callback Function to callback
   */
  trackSession(callback: (session?: ISolidSession) => void): void {
    this.on("session", callback);
  }

  /**
   * Allows tokens to be submitted to the authenticator manually
   * @param options A collection of possible tokens to submit
   */
  async applyTokens(options: {
    accessToken?: string;
    idToken?: string;
  }): Promise<void> {
    // TODO Handle ID_Token
    if (options.accessToken) {
      // TODO: Validate Access token
      await this.storage.set("accessToken", options.accessToken);
    }
  }

  /**
   * Performs a request using the saved auth credentials
   * @param requestInfo The url to which the request is sent
   * @param requestInit Fetch Init
   */
  async fetch(
    requestInfo: RequestInfo,
    requestInit?: RequestInit
  ): Promise<Response> {
    // TODO: fetching access token should be done elsewhere
    const authToken = await this.storage.get("accessToken");
    const clientKey = await this.storage.get("clientKey");
    if (!authToken || !clientKey) {
      // TODO: If we ever get here, it should kick off a login process
      throw new Error("Auth Token or client key not specified");
    }
    const credentials: IDpopRequestCredentials = {
      type: "dpop",
      authToken,
      clientKey
    };
    return this.authenticatedFetcher.handle(
      credentials,
      new URL(requestInfo.toString()),
      requestInit
    );
  }

  /**
   * Logs in a user based on provided options
   * @param loginOptions Details to help log in
   */
  async login(loginOptions: ILoginOptions): Promise<void> {
    await this.loginHandler.handle(loginOptions);
  }
}
