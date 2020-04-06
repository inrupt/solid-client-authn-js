/**
 * Handles login if it should be in a popup
 */
import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import ISolidSession from "../../solidSession/ISolidSession";
import { injectable, inject } from "tsyringe";
import { IEnvironmentDetector } from "src/util/EnvironmentDetector";

@injectable()
export default class PopUpLoginHandler implements ILoginHandler {
  constructor(
    @inject("environmentDetector") private environmentDetector: IEnvironmentDetector,
    @inject("loginHandler") private loginHandler: ILoginHandler
  ) {}

  async canHandle(loginOptions: ILoginOptions): Promise<boolean> {
    return !!loginOptions.popUp;
  }

  async handle(loginOptions: ILoginOptions): Promise<ISolidSession> {
    // TODO: implement
    throw new Error("Not Implemented");
  }
}
