import { inject, injectable } from "tsyringe";
import INeededAction from "../../solidSession/INeededAction";
import INeededInactionAction from "../../solidSession/INeededInactionAction";
import { IEnvironmentDetector } from "../../util/EnvironmentDetector";
import INeededRedirectAction from "../../solidSession/INeededRedirectAction";

export interface IRedirectorOptions {
  doNotAutoRedirect?: boolean;
  redirectByReplacingState?: boolean;
}

export interface IRedirector {
  redirect(
    redirectUrl: string,
    redirectorOptions: IRedirectorOptions
  ): INeededAction;
}

@injectable()
export default class Redirector implements IRedirector {
  constructor(
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector
  ) {}

  redirect(redirectUrl: string, options?: IRedirectorOptions): INeededAction {
    if (
      this.environmentDetector.detect() === "browser" &&
      !options?.doNotAutoRedirect
    ) {
      if (!options?.redirectByReplacingState) {
        window.location.href = redirectUrl;
      } else {
        window.history.replaceState({}, "", redirectUrl);
      }
      return {
        actionType: "inaction"
      } as INeededInactionAction;
    } else {
      return {
        actionType: "redirect",
        redirectUrl
      } as INeededRedirectAction;
    }
  }
}
