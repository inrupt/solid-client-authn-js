import { Selector, t } from "testcafe";
import LoginPage from "../page-models/LoginPage";
import { CognitoPage } from "../page-models/cognito";

// Login using NSS User
export async function loginNss(username: string, password: string) {
  await t
    .typeText("#username", username)
    .typeText("#password", password)
    .click("#login");
}

// Login using Google
export async function essGoogleLogin(
  brokerUrl: string,
  username: string,
  password: string
) {
  console.log("STARTING GOOGLE LOGIN");
  // Log in via ESS Broker service
  await LoginPage.submitLoginForm(brokerUrl);

  // Select Google
  await t.click('#wrap [alt="Google"]');

  // Enter login information
  await t
    .typeText("#identifierId", username)
    .click("#identifierNext .VfPpkd-RLmnJb")
    .typeText("#password .whsOnd.zHQkBf", password)
    .click("#passwordNext .VfPpkd-RLmnJb");

  // Authorize the application
  await t.click("#wrap .btn.btn-success.btn-large");
}

// Login using Twitter
export async function essTwitterLogin(
  brokerUrl: string,
  username: string,
  password: string,
  waitTime: number
) {
  // Log in via ESS Broker service
  await LoginPage.submitLoginForm(brokerUrl);

  await t.click('#wrap [alt="Auth0"]');

  await t.click(
    Selector("#auth0-lock-container-1 div")
      .withText("Sign in with Twitter")
      .nth(19)
  );

  await t
    .typeText("#username_or_email", username)
    .typeText("#password", password)
    .click("#allow");

  await t.click(
    "#wrap > div.container.main > div > form > div:nth-child(2) > input.btn.btn-success.btn-large"
  );
}

// ESS (GitHub) User
export async function essGithubLogin(
  brokerUrl: string,
  username: string,
  password: string,
  waitTime: number
) {
  // Log in via ESS Broker service
  await LoginPage.submitLoginForm(brokerUrl);

  await t.click('#wrap [alt="Auth0"]');

  await t.click(
    Selector("#auth0-lock-container-1 div")
      .withText("Sign in with GitHub")
      .nth(19)
  );

  await t
    .typeText("main .form-control.input-block", username)
    .typeText(
      Selector("main .form-control.form-control.input-block").nth(1),
      password
    )
    .click("main .btn.btn-primary.btn-block");

  await t.click("#wrap .btn.btn-success.btn-large");
}

/**
 *
 * @param brokerURL
 * @param username
 * @param password
 * @param waitTime
 */
export async function loginGluu(username: string, password: string) {
  await t
    .typeText("#loginForm\\:username", username)
    .typeText("#loginForm\\:password", password)
    .click("#loginForm\\:loginButton");
}

export async function loginCognito(username: string, password: string) {
  const cognitoPage = new CognitoPage();
  await cognitoPage.login(username, password);
}
