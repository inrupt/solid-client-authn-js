import { inject, injectable } from "tsyringe";
import INeededAction from "../../solidSession/INeededAction";
import INeededInactionAction from "../../solidSession/INeededInactionAction";
import { IEnvironmentDetector } from "../../util/EnvironmentDetector";

export interface IRedirector {
  redirect(): INeededAction;
}

@injectable()
export default class Redirector implements IRedirector {
  constructor(
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector
  ) {}

  redirect(): INeededAction {
    return {
      actionType: "inaction"
    } as INeededInactionAction;
  }
}
