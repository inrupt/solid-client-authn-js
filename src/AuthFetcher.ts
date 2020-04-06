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

@injectable()
export default class AuthFetcher {
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
  ) {}

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

  onSession(callback: (session: ISolidSession) => unknown): void {
    throw new Error("Not Implemented");
  }

  onLogout(callback: (session: ISolidSession) => unknown): void {
    throw new Error("Not Implemented");
  }

  async handleRedirect(url: string): Promise<ISolidSession> {
    return this.redirectHandler.handle(url);
  }

  async automaticallyHandleRedirect(): Promise<void> {
    if (this.environmentDetector.detect() === "browser") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      await this.handleRedirect(window.location.href);
    }
  }

  customAuthFetcher(options: {}): unknown {
    throw new Error("Not Implemented");
  }
}
