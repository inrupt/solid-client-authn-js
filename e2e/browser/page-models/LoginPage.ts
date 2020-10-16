import { t, Selector } from "testcafe";

class LoginPage {
  loginButton: Selector;
  identityProviderTextbox: Selector;

  constructor() {
    this.loginButton = Selector("#login_button");
    this.identityProviderTextbox = Selector("#identity_provider_textbox");
  }

  async submitLoginForm(identityServerUri: string) {
    await t
      .selectText(this.identityProviderTextbox)
      .typeText(this.identityProviderTextbox, identityServerUri)
      .click(this.loginButton);
  }
}

export default new LoginPage();
