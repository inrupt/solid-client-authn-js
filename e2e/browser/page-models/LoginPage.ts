import { t, Selector } from "testcafe";

class LoginPage {
  loginButton: Selector;
  identityProviderTextbox: Selector;

  constructor() {
    this.loginButton = Selector("button").withText("Log In");
    this.identityProviderTextbox = Selector("*").withAttribute(
      "data-testid",
      "identity_provider_textbox"
    );
  }

  async submitLoginForm(identityServerUri: string) {
    // If this select fails, it probably means our client application is not
    // running (since all we're trying to do here is select the identity
    // provider IRI textbox from a client application, so we can log into that
    // provider).
    // See our README, which recommends running 'demoClientApp' from the
    // examples within our browser package.
    await t
      .selectText(this.identityProviderTextbox)
      .typeText(this.identityProviderTextbox, identityServerUri)
      .click(this.loginButton);
  }
}

export default new LoginPage();
