/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
    return !!(
      loginOptions.popUp &&
      loginOptions.popUpRedirectPath &&
      this.environmentDetector.detect() === "browser"
    );
  }

  async handle(loginOptions: ILoginOptions): Promise<ISolidSession> {
    const currentUrl = new URL(window.location.href);
    currentUrl.set("pathname", loginOptions.popUpRedirectPath);
    const session = await this.loginHandler.handle({
      ...loginOptions,
      redirect: currentUrl,
      doNotAutoRedirect: true
    });
    // TODO: handle if session doesn't have redirect
    const popupWindow = window.open(
      (session.neededAction as INeededRedirectAction).redirectUrl,
      "Log In",
      "resizable,scrollbars,width=500,height=500,"
    );
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (!popupWindow || popupWindow.closed) {
          clearInterval(interval);
          resolve(
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
