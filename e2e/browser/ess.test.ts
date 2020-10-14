// import { essGoogleUser } from '../roles/roles';

// Page Models
import fetchPage from "./page-models/fetchPage";

// Helpers
import { essGithubLogin, essGoogleLogin } from "./helpers/login";

// Application that is being tested
// Google User
// Resources to test
const resources = require("./resources.json");

const applicationUrl =
  process.env.DEMO_URL ??
  "https://solid-client-authn-js-atdw4zl4r.vercel.app/demo/";
const essPodServer = "demo-ess.inrupt.com";
const essBrokerService = "broker";
const googleAccountID = process.env.E2E_GOOGLE_ACCOUNTID;
const googleUsername = process.env.E2E_GOOGLE_USERNAME;
const googlePassword = process.env.E2E_GOOGLE_PASSWORD;

// const githubAccountID = process.env.E2E_GITHUB_ACCOUNTID;
// const githubUsername = process.env.E2E_GITHUB_USERNAME;
// const githubPassword = process.env.E2E_GITHUB_PASSWORD;
const githubAccountID = "inrupt-broker-tester";
const githubUsername = "inrupt-broker-tester";
const githubPassword = "-W9VH-wudjhDAxHxCuzw";

// Fetch Tests
fixture("Fetch tests - ESS (Google)")
  //.disablePageCaching
  //.disablePageReloads
  .page(applicationUrl)
  .beforeEach(async (t) => {
    // Using Roles causes a sessionID error
    //await t.useRole(essGoogleUser);

    // Login
    // await essGoogleLogin('https://' + essBrokerService + '.' + essPodServer, googleUsername, googlePassword);
    await essGithubLogin(
      "https://" + essBrokerService + "." + essPodServer,
      githubUsername,
      githubPassword
    );
    await t.wait(3000);
    await t.expect(fetchPage.fetchButton.exists).ok("Logged in");
  });

test(`Resource: Get GitHub-associated Pod private resource'`, async t => {
  // Form the URI of the resource to fetch
  const webID = 'https://ldp.' + essPodServer + '/' + githubAccountID;
  // var fetchUriTextbox = data.URI.replace('<WEBID>', webID);
  const fetchURI = `${webID}/private/End-2-End-Test/private-resource.ttl`;

  await t
    .selectText(fetchPage.fetchUri)
    .typeText(fetchPage.fetchUri, fetchURI)
    .click(fetchPage.fetchButton)
    .wait(2000);
  // .expect(FetchPage.fetchResponseTextbox.textContent).contains(data.response, "Valid response");

  const answer = await fetchPage.fetchResponse.textContent;
  console.log(`Text: [${answer}]...`);
  await t.expect(fetchPage.fetchResponse.textContent).contains("Top secret access code!", "Valid response");
});


// // Process all of the resources
// resources.forEach((data) => {
//   test(`Resource: '${data.Name}'`, async (t) => {
//     await t
//       .expect(FetchPage.fetchUriTextbox.getAttribute("value"))
//       .eql("https://broker.demo-ess.inrupt.com/");
//
//     // Form the URI of the resource to fetch
//     // var webID = 'https://ldp.' + essPodServer + '/' + googleAccountID;
//     // var fetchUriTextbox = data.URI.replace('<WEBID>', webID);
//
//     // await t
//     //     .selectText(FetchPage.fetchUriTextbox)
//     //     .typeText(FetchPage.fetchUriTextbox, fetchUriTextbox)
//     //     .click(FetchPage.fetchButton)
//     //     .wait(2000)
//     //     .expect(FetchPage.fetchResponseTextbox.textContent).contains(data.response, "Valid response");
//   });
// });
