import { RequestInfo, RequestInit, Response } from "node-fetch";
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

@injectable()
export default class AuthFetcher {
  private globalUserName = "global";
  constructor(
    @inject("loginHandler") private loginHandler: ILoginHandler,
    @inject("redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher
  ) {}

  async login(options: ILoginInputOptions): Promise<ISolidSession> {
    // TODO: this should be improved. It mutates the input
    validateSchema(loginInputOptionsSchema, options, { throwError: true });
    // TODO: this type conversion is really bad
    return this.loginHandler.handle(({
      ...options,
      localUserId: "global"
    } as unknown) as ILoginOptions);
  }

  async fetch(url: RequestInfo, init: RequestInit): Promise<Response> {
    return this.authenticatedFetcher.handle(
      {
        localUserId: "global",
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
    return this.sessionCreator.getSession("global");
  }

  async uniqueLogin(options: ILoginInputOptions): Promise<ISolidSession> {
    // TODO: This code repreats login should be factored out
    // TODO: this should be improved. It mutates the input
    validateSchema(loginInputOptionsSchema, options, { throwError: true });
    // TODO: this type conversion is really bad
    return this.loginHandler.handle((options as unknown) as ILoginOptions);
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

  customAuthFetcher(options: {}): unknown {
    throw new Error("Not Implemented");
  }
}
