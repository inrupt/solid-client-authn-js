import { Selector } from "testcafe";

class FetchPage {
  fetchUriTextbox: Selector;
  fetchButton: Selector;
  fetchResponseTextbox: Selector;
  logoutButton: Selector;

  constructor() {
    this.fetchUriTextbox = Selector("*").withAttribute(
      "data-testid",
      "fetch_uri_textbox"
    );
    this.fetchResponseTextbox = Selector("*").withAttribute(
      "data-testid",
      "fetch_response_textbox"
    );
    this.fetchButton = Selector("button").withText("Fetch");
    this.logoutButton = Selector("button").withText("Log Out");
  }
}

export default new FetchPage();
