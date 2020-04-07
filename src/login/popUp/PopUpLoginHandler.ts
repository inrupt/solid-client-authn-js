/**
 * Handles login if it should be in a popup
 */
import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import ISolidSession from "../../solidSession/ISolidSession";
import { injectable, inject } from "tsyringe";
import { IEnvironmentDetector } from "../../util/EnvironmentDetector";
import INeededRedirectAction from "../../solidSession/INeededRedirectAction";
import URL from "url-parse";
import { ISessionCreator } from "../../solidSession/SessionCreator";

@injectable()
export default class PopUpLoginHandler implements ILoginHandler {
  constructor(
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector,
    @inject("postPopUpLoginHandler") private loginHandler: ILoginHandler,
    @inject("sessionCreator") private sessionCreator: ISessionCreator
  ) {}

  async canHandle(loginOptions: ILoginOptions): Promise<boolean> {
    return !!(loginOptions.popUp && loginOptions.popUpRedirectPath);
  }

  async handle(loginOptions: ILoginOptions): Promise<ISolidSession> {
    // If we're not in the browser just login normally
    if (this.environmentDetector.detect() !== "browser") {
      return this.loginHandler.handle({ ...loginOptions });
    }
    const curUrl = new URL(window.location.href);
    curUrl.set("pathname", loginOptions.popUpRedirectPath);
    const session = await this.loginHandler.handle({
      ...loginOptions,
      redirect: curUrl,
      doNotAutoRedirect: true
    });
    // TODO: handle if session doesn't have redirect
    const popupWindow = window.open(
      (session.neededAction as INeededRedirectAction).redirectUrl,
      "Log In",
      "resizable,scrollbars,width=500,height=500,"
    );
    return new Promise((res, rej) => {
      const interval = setInterval(async () => {
        if (popupWindow?.closed) {
          clearInterval(interval);
          res(
            // TODO: handle if this fails
            (await this.sessionCreator.getSession(
              loginOptions.localUserId || "global"
            )) as ISolidSession
          );
        }
      }, 500);
    });
  }
}
