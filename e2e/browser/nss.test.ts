import { nssLogin } from "./helpers/login";

// Page Models
import fetchPage from "./page-models/fetchPage";

// Resources to test
const resources = require("./resources.json");

const applicationUrl =
  process.env.DEMO_URL ??
  "https://solid-client-authn-js-atdw4zl4r.vercel.app/demo/";
const nssPodServer = "inrupt.net";
const nssUsername = process.env.E2E_NSS_USERNAME;
const nssPassword = process.env.E2E_NSS_PASSWORD;

// Fetch Tests
fixture("Fetch tests - NSS")
  //.disablePageCaching
  //.disablePageReloads
  .page(applicationUrl)
  .beforeEach(async (t) => {
    // Login
    await nssLogin("https://" + nssPodServer, nssUsername, nssPassword);
    await t.wait(10000);
    await t.expect(fetchPage.fetchButton.exists).ok("Logged in");
  });

// Process all of the resources
resources.forEach((data) => {
  test(`Resource: '${data.Name}'`, async (t) => {
    // Form the URI of the resource to fetch
    var webID = "https://" + nssUsername + "." + nssPodServer;
    var fetchURI = data.URI.replace("<WEBID>", webID);

    await t
      .selectText(fetchPage.fetchUri)
      .typeText(fetchPage.fetchUri, fetchURI)
      .click(fetchPage.fetchButton)
      .wait(2000)
      .expect(fetchPage.fetchResponse.textContent)
      .contains(data.AuthorisedResponse, "Authorized");
  });
});
