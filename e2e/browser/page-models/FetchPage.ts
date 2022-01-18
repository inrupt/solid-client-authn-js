import { Selector } from "testcafe";

class FetchPage {
  appStatus: Selector;
  webIdStorage: Selector;
  fetchUriTextbox: Selector;
  fetchButton: Selector;
  fetchResponseTextbox: Selector;
  logoutButton: Selector;

  constructor() {
    this.appStatus = Selector("*").withAttribute("data-testid", "app-status");
    this.webIdStorage = Selector("*").withAttribute(
      "data-testid",
      "webid_storage"
    );
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
