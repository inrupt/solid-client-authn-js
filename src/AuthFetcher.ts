import ISolidSession from "./solidSession/ISolidSession";
import ILoginInputOptions, {
  loginInputOptionsSchema
} from "./ILoginInputOptions";
import { injectable, inject } from "tsyringe";
import ILoginHandler from "./login/ILoginHandler";
import ILoginOptions from "./login/ILoginOptions";
import validateSchema from "./util/validateSchema";
import IRedirectHandler from "./login/oidc/redirectHandler/IRedirectHandler";
import ILogoutHandler from "./logout/ILogoutHandler";
import { ISessionCreator } from "./solidSession/SessionCreator";
import IAuthenticatedFetcher from "./authenticatedFetch/IAuthenticatedFetcher";
import { IEnvironmentDetector } from "./util/EnvironmentDetector";
import { EventEmitter } from "events";

@injectable()
export default class AuthFetcher extends EventEmitter {
  private globalUserName = "global";
  constructor(
    @inject("loginHandler") private loginHandler: ILoginHandler,
    @inject("redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher,
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector
  ) {
    super();
  }

  private async loginHelper(
    options: ILoginInputOptions,
    localUserId?: string
  ): Promise<ISolidSession> {
    const internalOptions: ILoginOptions = validateSchema(
      loginInputOptionsSchema,
      options
    );
    if (localUserId) {
      internalOptions.localUserId = localUserId;
    }
    return this.loginHandler.handle(internalOptions);
  }

  async login(options: ILoginInputOptions): Promise<ISolidSession> {
    return this.loginHelper(options, this.globalUserName);
  }

  async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    this.emit("request", url, init);
    return this.authenticatedFetcher.handle(
      // TODO: generate request credentials separately
      {
        localUserId: this.globalUserName,
        type: "dpop"
      },
      url,
      init
    );
  }

  async logout(): Promise<void> {
    await this.logoutHandler.handle(this.globalUserName);
  }

  async getSession(): Promise<ISolidSession | null> {
    return this.sessionCreator.getSession(this.globalUserName);
  }

  async uniqueLogin(options: ILoginInputOptions): Promise<ISolidSession> {
    return this.loginHelper(options);
  }

  async onSession(
    callback: (session: ISolidSession) => unknown
  ): Promise<void> {
    // TODO: this should be updated to handle non global as well
    const currentSession = await this.getSession();
    if (currentSession) {
      callback(currentSession);
    }
    this.on("session", callback);
  }

  async onLogout(callback: (session: ISolidSession) => unknown): Promise<void> {
    throw new Error("Not Implemented");
  }

  async onRequest(
    callback: (RequestInfo: RequestInfo, requestInit: RequestInit) => unknown
  ): Promise<void> {
    this.on("request", callback);
  }

  async handleRedirect(url: string): Promise<ISolidSession> {
    const session = await this.redirectHandler.handle(url);
    this.emit("session", session);
    return session;
  }

  async automaticallyHandleRedirect(): Promise<void> {
    if (this.environmentDetector.detect() === "browser") {
      await this.handleRedirect(window.location.href);
    }
  }

  customAuthFetcher(options: {}): unknown {
    throw new Error("Not Implemented");
  }
}
