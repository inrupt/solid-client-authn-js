import { t, Selector } from 'testcafe';
// import { screen } from '@testing-library/testcafe';

class loginPage {
    loginButton: Selector;
    identityTextBox: Selector;

    constructor () {
        //this.title = screen.findByRole('heading', { name: /solid\-client\-authn\-browser api demo \- login/i });

        // this.loginButton = screen.findByRole('button', { name: /log in/i });
        this.loginButton = Selector('button');

        //this.identityLabel = screen.findByText(/login with your identity provider:/i)

        // this.identityTextBox = screen.findByRole('textbox');
        this.identityTextBox = Selector('input[type=text]');
    }


    async submitLoginForm(identityServerURL) {
        await t
            .selectText(this.identityTextBox)
            .typeText(this.identityTextBox, identityServerURL)
            .click(this.loginButton);
    }
}

export default new loginPage();
