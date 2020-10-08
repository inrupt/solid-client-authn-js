import { nssLogin } from '../helpers/login.js';

// Page Models
import fetchPage from '../page-models/fetchPage.js';

// Application to test
import { applicationURL } from '../variables.js';

// NSS Server
import { nssPodServer } from '../variables.js';

// NSS User
import { nssUsername, nssPassword } from '../variables.js';

// Resources to test
const resources = require('./resources.json');

// Fetch Tests
fixture('Fetch tests - NSS')
    //.disablePageCaching
    //.disablePageReloads
    .page(applicationURL)
    .beforeEach( async t => {

        // Login
        await nssLogin('https://' + nssPodServer, nssUsername, nssPassword);
        await t.wait(10000);
        await t.expect(fetchPage.fetchButton.exists).ok("Logged in");
    });

// Process all of the resources
resources.forEach(data => {
    test(`Resource: '${data.Name}'`, async t => {

        // Form the URI of the resource to fetch
        var webID = 'https://' + nssUsername + '.' + nssPodServer;
        var fetchURI = data.URI.replace('<WEBID>', webID);

        await t
            .selectText(fetchPage.fetchURI)
            .typeText(fetchPage.fetchURI, fetchURI)
            .click(fetchPage.fetchButton)
            .wait(2000)
            .expect(fetchPage.fetchResponse.textContent).contains(data.AuthorisedResponse, "Authorized");

    });
});
