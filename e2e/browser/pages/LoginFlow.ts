import { expect, Page } from "@playwright/test";
import { TestingEnvironment } from "../../setup/e2e-setup";

export class LoginFlow {
  readonly page: Page;
  private readonly env: TestingEnvironment;

  constructor(page: Page, environment: TestingEnvironment) {
    this.page = page;
    this.env = environment;
  }

  async perform(username: string, password: string) {
    const currentUrl = new URL(this.page.url());

    if (currentUrl.hostname.endsWith("inrupt.com")) {
      return this.performCognitoLogin(username, password);
    } else if (currentUrl.hostname.endsWith("inrupt.net")) {
      return this.performNssLogin(username, password);
    } else {
      throw new Error("Unknown login type");
    }
  }

  // FIXME: NSS can't be tested because the whole e2e setup can't execute on NSS:
  private async performNssLogin(username: string, password: string) {
    // console.log("Performing nss login");

    await this.page.fill("#username", username);
    await this.page.fill("#password", password);

    await Promise.all([
      // Cognito does a synchronous navigation:
      this.page.waitForNavigation({
        waitUntil: "networkidle",
      }),
      // Click the login button:
      this.page.click("#login"),
    ]);
  }

  private async performCognitoLogin(username: string, password: string) {
    // console.log("Performing cognito login");

    // Check to ensure that the large login form is visible, apparently there are multiple:
    expect(this.page.isVisible(".visible-lg [type=text]")).toBeTruthy();

    await this.page.fill(".visible-lg [type=text]", username);
    await this.page.fill(".visible-lg [type=password]", password);

    await Promise.all([
      // Cognito does a synchronous navigation:
      this.page.waitForNavigation({
        waitUntil: "networkidle",
      }),
      // Click the login button:
      this.page.click(".visible-lg [aria-label=submit]"),
    ]);
  }

  async approveAuthorization() {
    // FIXME: should there be a validation here that we are actually on the brokers page?

    const approveButtonSelector = 'button[form="approve"]';

    // Check we really do have the approve button:
    expect(this.page.isVisible(approveButtonSelector)).toBeTruthy();

    await this.page.click(approveButtonSelector);

    // For some reason doing this the recommended way (by installing the handler
    // before triggering the button click), fails in Safari:
    await this.page.waitForNavigation({
      waitUntil: "networkidle",
    });
  }
}
