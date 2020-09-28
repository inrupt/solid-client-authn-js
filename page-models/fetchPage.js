import { Selector } from 'testcafe';
import { screen } from '@testing-library/testcafe';

class fetchPage {
    constructor () {

        //this.webidLabel = screen.findByText(/webid:/i);
        //this.webid = screen.findByText(/https:\/\/ldp.demo-ess.inrupt.com\/113897280460524999456\/profile\/card#me/i);

        this.fetchURI = screen.findByRole('textbox');
        //this.fetchURI = Selector('#container > div > form > div:nth-child(1) > input[type=text]');

        this.fetchButton = screen.findByRole('button', { name: /fetch/i });
        //this.fetchButton = Selector('#container > div > form > div:nth-child(1) > button');

        //this.resourceLabel = screen.findByText(/resource:/i);

        this.fetchResponse = Selector('#container > div > form > div:nth-child(3) > pre');
        
        this.logoutButton = screen.findByRole('button', { name: /log out/i });
        //this.logoutButton = Selector('#container > div > div > form > button');
    }
}

export default new fetchPage();