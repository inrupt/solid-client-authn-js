import { Role, Selector, t } from 'testcafe';
import loginPage from '../page-models/loginPage.js';

// Application that is being tested
import { applicationURL } from '../variables.js';

// NSS Server
import { nssPodServer } from '../variables.js';

// ESS Server
import { essPodServer, essBrokerService } from '../variables.js';

// NSS User
import { nssUsername, nssPassword } from '../variables.js';
export const nssUser = Role(applicationURL, async t => {

    await loginPage.submitLoginForm('https://' + nssPodServer);

    await t
        .typeText('#username', nssUsername)
        .typeText('#password', nssPassword)
        .click('#login');
    }, { preserveUrl: true });


// ESS (Google) User
import { googleUsername, googlePassword } from '../variables.js';
export const essGoogleUser = Role(applicationURL, async t => {
    
    // Log in via ESS Broker service
    await loginPage.submitLoginForm('https://' + essBrokerService + '.' + essPodServer);

    await t
        .click('#wrap [alt="Google"]');

    await t
        .typeText('#identifierId', googleUsername)
        .click('#identifierNext .VfPpkd-RLmnJb')
        .typeText('#password .whsOnd.zHQkBf', googlePassword)
        .click('#passwordNext .VfPpkd-RLmnJb');

    await t
        .click('#wrap .btn.btn-success.btn-large');

}, { preserveUrl: true });


// ESS (Twitter) User
export const essTwitterUser = Role(applicationURL, async t => {
    
    // Log in via ESS Broker service
    await loginPage.submitLoginForm('https://' + essBrokerService + '.' + essPodServer);

    await t
        .click('#wrap [alt="Auth0"]');

    await t
        .click(Selector('#auth0-lock-container-1 div').withText('Sign in with Twitter').nth(19));

    await t
        .typeText('#username_or_email', podUsername)
        .typeText('#password', podPassword)
        .click('#allow');

    await t
        .click('#wrap > div.container.main > div > form > div:nth-child(2) > input.btn.btn-success.btn-large');
}, { preserveUrl: true });


// ESS (GitHub) User
export const essGitHubUser = Role(applicationURL, async t => {
    
    // Log in via ESS Broker service
    await loginPage.submitLoginForm('https://' + essBrokerService + '.' + essPodServer);

    await t
        .click('#wrap [alt="Auth0"]');

    await t
        .click(Selector('#auth0-lock-container-1 div').withText('Sign in with GitHub').nth(19));

    await t
        .typeText('main .form-control.input-block', podUsername)
        .typeText(Selector('main .form-control.form-control.input-block').nth(1), podPassword)
        .click('main .btn.btn-primary.btn-block');

    await t
        .click('#wrap .btn.btn-success.btn-large');
}, { preserveUrl: true });
