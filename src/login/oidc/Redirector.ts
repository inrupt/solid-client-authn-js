import { inject, injectable } from "tsyringe";
import INeededAction from "../../solidSession/INeededAction";
import INeededInactionAction from "../../solidSession/INeededInactionAction";
import { IEnvironmentDetector } from "../../util/EnvironmentDetector";
import INeededRedirectAction from "../../solidSession/INeededRedirectAction";

export interface IRedirector {
  redirect(redirectUrl: string): INeededAction;
}

@injectable()
export default class Redirector implements IRedirector {
  constructor(
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector
  ) {}

  redirect(redirectUrl: string): INeededAction {
    if (this.environmentDetector.detect() === "browser") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      window.location.href = redirectUrl;
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
