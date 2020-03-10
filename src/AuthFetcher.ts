import { RequestInfo, RequestInit, Response } from "node-fetch";
import ISolidSession from "./ISolidSession";
import ILoginInputOptions, {
  loginInputOptionsSchema
} from "./ILoginInputOptions";
import { injectable, inject } from "tsyringe";
import ILoginHandler from "./login/ILoginHandler";
import ILoginOptions from "./login/ILoginOptions";
import validateSchema from "./util/validateSchema";
import IRedirectHandler from "./login/oidc/redirectHandler/IRedirectHandler";
import ILogoutHandler from "./logout/ILogoutHandler";
import INeededAction from "./neededAction/INeededAction";

@injectable()
export default class AuthFetcher {
  private globalUserName = "global";
  constructor(
    @inject("loginHandler") private loginHandler: ILoginHandler,
    @inject("redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler
  ) {}

  async login(options: ILoginInputOptions): Promise<INeededAction> {
    throw new Error("Not Implemented");
  }

  async fetch(url: RequestInfo, init: RequestInit): Promise<Response> {
    throw new Error("Not Implemented");
  }

  async logout(): Promise<void> {
    await this.logoutHandler.handle(this.globalUserName);
  }

  async getSession(): Promise<ISolidSession> {
    throw new Error("Not Implemented");
  }

  async uniqueLogin(options: ILoginInputOptions): Promise<INeededAction> {
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
