import { Selector } from "testcafe";
// import { screen } from '@testing-library/testcafe';

class FetchPage {
  fetchUriTextbox: Selector;
  fetchButton: Selector;
  fetchResponseTextbox: Selector;
  logoutButton: Selector;

  constructor() {
    this.fetchUriTextbox = Selector("#fetch_uri_textbox");
    this.fetchButton = Selector("#fetch_button");
    this.fetchResponseTextbox = Selector("#fetch_response_textbox");
    this.logoutButton = Selector("logout_button");
  }
}

export default new FetchPage();
