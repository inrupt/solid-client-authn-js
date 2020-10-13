// import { essGoogleUser } from '../roles/roles';

// Page Models
import fetchPage from './page-models/fetchPage';

// Helpers
import { essGithubLogin, essGoogleLogin } from './helpers/login';

// Application that is being tested
// Google User
// Resources to test
const resources = require('./resources.json');

const applicationUrl = process.env.DEMO_URL ?? "https://solid-client-authn-js-atdw4zl4r.vercel.app/demo/";
const essPodServer = "demo-ess.inrupt.com";
const essBrokerService = "broker";
const googleAccountID = process.env.E2E_GOOGLE_ACCOUNTID;
const googleUsername = process.env.E2E_GOOGLE_USERNAME;
const googlePassword = process.env.E2E_GOOGLE_PASSWORD;
const githubUsername = process.env.E2E_GITHUB_USERNAME;
const githubPassword = process.env.E2E_GITHUB_PASSWORD;

// Fetch Tests
fixture('Fetch tests - ESS (Google)')
    //.disablePageCaching
    //.disablePageReloads
    .page(applicationUrl)
    // .beforeEach( async t => {

    //     // Using Roles causes a sessionID error
    //     //await t.useRole(essGoogleUser);

    //     // Login
    //     // await essGoogleLogin('https://' + essBrokerService + '.' + essPodServer, googleUsername, googlePassword);
    //     await essGithubLogin('https://' + essBrokerService + '.' + essPodServer, githubUsername, githubPassword);
    //     await t.wait(3000);
    //     await t.expect(fetchPage.fetchButton.exists).ok("Logged in");
    // });

// Process all of the resources
resources.forEach(data => {
    test(`Resource: '${data.Name}'`, async t => {

        await t.expect(fetchPage.fetchURI.getAttribute("value")).eql("https://broker.demo-ess.inrupt.com/")

        // Form the URI of the resource to fetch
        // var webID = 'https://ldp.' + essPodServer + '/' + googleAccountID;
        // var fetchURI = data.URI.replace('<WEBID>', webID);

        // await t
        //     .selectText(fetchPage.fetchURI)
        //     .typeText(fetchPage.fetchURI, fetchURI)
        //     .click(fetchPage.fetchButton)
        //     .wait(2000)
        //     .expect(fetchPage.fetchResponse.textContent).contains(data.response, "Valid response");
    });
});
