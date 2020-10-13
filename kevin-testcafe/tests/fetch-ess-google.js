// import { essGoogleUser } from '../roles/roles.js';

// Page Models
import fetchPage from '../page-models/fetchPage.js';

// Helpers
import { essGoogleLogin } from '../helpers/login.js';

// Application that is being tested
import { applicationURL } from '../variables.js';

// ESS Server
import { essPodServer, essBrokerService } from '../variables.js';

// Google User
import { googleUsername, googlePassword, googleAccountID } from '../variables.js';

// Resources to test
const resources = require('./resources.json');

// Fetch Tests
fixture('Fetch tests - ESS (Google)')
    //.disablePageCaching
    //.disablePageReloads
    .page(applicationURL)
    .beforeEach( async t => {

        // Using Roles causes a sessionID error
        //await t.useRole(essGoogleUser);

        // Login
        await essGoogleLogin('https://' + essBrokerService + '.' + essPodServer, googleUsername, googlePassword);
        await t.wait(3000);
        await t.expect(fetchPage.fetchButton.exists).ok("Logged in");
    });

// Process all of the resources
resources.forEach(data => {
    test(`Resource: '${data.Name}'`, async t => {

        // Form the URI of the resource to fetch
        var webID = 'https://ldp.' + essPodServer + '/' + googleAccountID;
        var fetchURI = data.URI.replace('<WEBID>', webID);

        await t
            .selectText(fetchPage.fetchURI)
            .typeText(fetchPage.fetchURI, fetchURI)
            .click(fetchPage.fetchButton)
            .wait(2000)
            .expect(fetchPage.fetchResponse.textContent).contains(data.response, "Valid response");
    });
});
