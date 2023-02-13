//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import React, { Component } from "react";
import "regenerator-runtime/runtime";

import {
  login,
  getDefaultSession,
  handleIncomingRedirect,
  logout,
  fetch,
} from "@inrupt/solid-client-authn-browser";

const clientApplicationName = "S-C-A Browser Demo Client App";
let snackBarTimeout;

const NSS_SERVER_URL = "https://inrupt.net/";

const preconfiguedIdpList = [
  "https://openid.dev-next.inrupt.com",
  "https://login.inrupt.com",
  "https://inrupt.net",
];

const defaultIssuer = preconfiguedIdpList[1];

const style = {
  display: "block",
  background: "#A0C5E8",
  padding: "5px",
  margin: "0 0 1em 0",
};

function identityProviderConfigUrl(url) {
  return `${url}${
    url.endsWith("/") ? "" : "/"
  }.well-known/openid-configuration`;
}

// This exists in IssuerConfigFetcher, but isn't publicly accessible:
async function fetchIdentityProviderConfig(idpConfigEndpoint) {
  return fetch(idpConfigEndpoint).then((response) => response.json());
}

const REDIRECT_URL = "http://localhost:3001"

class DemoClientApp extends Component {
  constructor(props) {
    super(props);

    const session = getDefaultSession();

    session.onLogout(() => {
      this.setState({
        status: "login",
        fetchLoading: false,
        fetchBody: null,
        idpUserInfo: null,
        idpConfig: null,
      });
    });

    session.onSessionRestore(() => {
      this.onLoginOrRestore();
    });

    session.onLogin(() => {
      this.onLoginOrRestore();
    });

    this.state = {
      status: "loading",
      // FIXME: This is currently wrong on session restore, as we don't expose the Issuer from ISessionInfo
      loginIssuer: defaultIssuer,
      clearClientRegistrationInfo: true,
      fetchRoute: "",
      fetchLoading: false,
      fetchBody: null,
      idpConfig: null,
      idpUserInfo: null,
      enableIdpButtons: false,
    };

    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleFetchIdentityProviderConfig =
      this.handleFetchIdentityProviderConfig.bind(this);
    this.handleFetch = this.handleFetch.bind(this);
  }

  async componentDidMount() {
    // restore the existing session or handle the redirect from login:
    const sessionInfo = await handleIncomingRedirect({
      restorePreviousSession: true,
    });

    if (sessionInfo && sessionInfo.isLoggedIn) {
      this.onLoginOrRestore();
    } else {
      this.setState({ status: "login" });
    }
  }

  async onLoginOrRestore() {
    const session = getDefaultSession();

    if (!session.info.isLoggedIn) {
      this.setState({ status: "login" });
    } else {
      this.setState({
        status: "dashboard",
        loginIssuer: this.state.loginIssuer,
        fetchRoute: "",
      });

      this.fetchIdentityProviderInfo(this.state.loginIssuer);
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    this.setState({ status: "loading" });

    await login({
      redirectUrl: REDIRECT_URL,
      oidcIssuer: this.state.loginIssuer,
      clientName: clientApplicationName,
    });
  }

  async handleFetchIdentityProviderConfig() {
    try {
      const config = await fetchIdentityProviderConfig(
        identityProviderConfigUrl(this.state.loginIssuer)
      );

      this.setState({ idpConfig: JSON.stringify(config, null, 2) });
    } catch (err) {
      this.setState({ idpConfig: `Error loading IdP config: ${err}` });
    }
  }

  // FIXME: Support logout at IDP
  async handleLogout(e) {
    e.preventDefault();

    this.setState({ status: "loading" });

    await logout();

    this.setState({
      status: "login",
      idpConfig: null,
      fetchBody: null,
    });
  }

  async handleFetch(e) {
    e.preventDefault();

    this.setState({ fetchLoading: true });

    try {
      const response = await (await fetch(this.state.fetchRoute, {})).text();

      this.setState({ fetchBody: response, fetchLoading: false });
    } catch (err) {
      this.setState({ fetchLoading: false });
    }
  }

  displaySnackBar(text) {
    const snackBar = document.getElementById("snackbar");
    if (!snackBar) throw new Error("Snackbar not found in DOM");
    snackBar.className = "show";
    snackBar.innerHTML = text;
    if (snackBarTimeout) {
      clearTimeout(snackBarTimeout);
    }
    snackBarTimeout = setTimeout(function () {
      snackBar.className = snackBar.className.replace("show", "");
    }, 3000);
  }

  async fetchIdentityProviderInfo(url) {
    // Handles the case on session restore where we don't have access to the issuer:
    if (!url) {
      return;
    }

    const session = getDefaultSession();
    const idpConfigEndpoint = identityProviderConfigUrl(url);

    return fetchIdentityProviderConfig(idpConfigEndpoint)
      .then((result) => {
        this.setState({
          enableIdpButtons: !!result.end_session_endpoint,
        });

        if (result.userinfo_endpoint) {
          if (result.userinfo_endpoint.startsWith(NSS_SERVER_URL)) {
            const message = `Identity Provider is NSS, but it's support for user information is currently broken - so we can't verify the current \`id_token\` against the identity provider.`;

            this.setState({ idpUserInfo: message });
          } else {
            session
              .fetch(result.userinfo_endpoint)
              .then((response) => {
                if (response.status !== 200) {
                  this.setState({
                    idpUserInfo: `Failed to retrieve userinfo from identity provider, status: ${response.status}`,
                  });

                  return null;
                }

                return response.json();
              })
              .then((result) => {
                if (result) {
                  const loggedInAs = result.sub;
                  this.setState({
                    idpUserInfo: `Logged into Identity Provider as user: ${loggedInAs}`,
                  });
                }
              })
              .catch((error) => {
                this.setState({
                  idpUserInfo: `Not logged into Identity Provider; Error: ${error}`,
                });
              });
          }
        } else {
          this.setState({
            idpUserInfo: `Identity Provider doesn't provide access to currently logged-in user information`,
          });
        }
      })
      .catch((error) => {
        console.error(
          `It appears that [${idpConfigEndpoint}] is not a valid Identity Provider configuration endpoint: ${error}`
        );

        this.setState({
          enableIdpButtons: false,
          idpUserInfo: `Endpoint does appear to be a valid Identity Provider: ${error}`,
        });
      });
  }

  renderLogin() {
    return (
      <div style={style}>
        <div>
          <div className="tooltip">
            <div>
              <span>Login with your Identity Provider:</span>
              &nbsp;<i className="fa fa-info-circle"></i>
              &nbsp;
            </div>

            <span className="tooltiptext">
              Your Identity Provider is who you trust to manage your identity.
              <p></p>
              Hover your mouse over the editbox and click the 'x' on the
              right-hand side of the field to clear it, and then use the 'down
              arrow' icon to select from various public Identity Provider
              options.
            </span>
          </div>
          <input
            data-testid="idp_input"
            list="preconfigued_idp_list"
            type="search"
            size={80}
            value={this.state.loginIssuer}
            onChange={(e) => {
              this.setState({ loginIssuer: e.target.value, idpConfig: null });
            }}
          />
          <datalist id="preconfigued_idp_list">
            {preconfiguedIdpList.map((idp) => (
              <option value={idp} key={idp} />
            ))}
          </datalist>
          &nbsp;
          <button data-testid="idp_login_button" onClick={this.handleLogin}>
            Log In
          </button>
        </div>

        <div className="tooltip">
          <div>
            <input
              type="checkbox"
              data-testid="login_reauthorize"
              checked={this.state.clearClientRegistrationInfo}
              onChange={(e) => {
                this.setState({
                  clearClientRegistrationInfo: e.target.checked,
                });
                this.displaySnackBar(
                  e.target.checked
                    ? "Login will force a re-authorization"
                    : "Login will use existing authorizations (if any!)"
                );
              }}
            />
            <label>Re-authorize this client application on login</label>
            &nbsp;<i className="fa fa-info-circle"></i>
          </div>

          <span className="tooltiptext">
            Re-authorize this Client Application on login.
            <p></p>
            For example, to change the access permissions you may have already
            granted to this application.
          </span>
        </div>
      </div>
    );
  }

  renderFetchResource() {
    return (
      <div style={style}>
        <form>
          <strong>Resource: </strong>
          <input
            data-testid="fetch_uri_textbox"
            size={80}
            type="text"
            value={this.state.fetchRoute}
            onChange={(e) => this.setState({ fetchRoute: e.target.value })}
          />
          <button data-testid="fetch_button" onClick={this.handleFetch}>
            Fetch
          </button>
        </form>

        {this.state.fetchLoading ? (
          <span>Loading...</span>
        ) : (
          <pre
            data-testid="fetch_response_textbox"
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {this.state.fetchBody || "not fetched"}
          </pre>
        )}
      </div>
    );
  }

  renderUserInfo() {
    const session = getDefaultSession();
    console.log(`Current logged in state: [${session.info.isLoggedIn}]`);

    return (
      <>
        <div style={style}>
          <div>
            <p>
              UserInfo:{" "}
              <span className="tooltip">
                <i className="fa fa-info-circle"></i>
                <span className="tooltiptext">
                  Information on the currently logged-in user (if logged in!)
                  from the 'UserInfo' endpoint of the Identity Provider.
                </span>
              </span>
            </p>
            <pre>
              <code id="idp_userinfo_text">{this.state.idpUserInfo}</code>
            </pre>
          </div>
        </div>
        <div style={style}>
          <h2>Identity Provider</h2>

          <div className="tooltip">
            <div>
              <button disabled={true}>Logout from Identity Provider</button>
              &nbsp;<i className="fa fa-info-circle"></i>
              &nbsp;
            </div>
          </div>

          <div className="tooltip">
            <button onClick={this.handleFetchIdentityProviderConfig}>
              Fetch Config from Identity Provider
            </button>
          </div>

          {this.state.idpConfig && (
            <div>
              <h2>IdP Config:</h2>
              <pre>
                <code>{this.state.idpConfig}</code>
              </pre>
            </div>
          )}
        </div>
      </>
    );
  }

  renderDashboard(session) {
    return (
      <div>
        <div style={style}>
          <h2>Authenticated! Ready to browse...</h2>
          <p>
            <strong>Session Provider:</strong>{" "}
            <code>{this.state.loginIssuer}</code>
            <br />
            Note: this value is currently incorrect on session restore, as we
            don't currently expose the issuer from the session info.
          </p>
          <p>
            <strong>WebID:</strong> <code>{session.info.webId}</code>
          </p>
          <div className="tooltip">
            <form>
              <button
                onClick={this.handleLogout}
                disabled={!session.info.isLoggedIn}
              >
                Log Out
              </button>
              &nbsp;<i className="fa fa-info-circle"></i>
            </form>
            <span className="tooltiptext">
              Log out of this client application.
              <br />
              <br />
              NOTE: This button is only enabled if you are currently logged in.
            </span>
          </div>
        </div>

        {this.renderFetchResource()}

        {this.renderUserInfo()}
      </div>
    );
  }

  renderUI() {
    switch (this.state.status) {
      case "loading":
        return <h1>Loading...</h1>;
      case "login":
        return (
          <>
            {this.renderLogin()}
            {this.renderFetchResource()}
          </>
        );
      case "dashboard":
        return this.renderDashboard(getDefaultSession());
      default:
        return (
          <p>Something seems to have gone wrong, please reload the page</p>
        );
    }
  }

  render() {
    return (
      <>
        <h1>{clientApplicationName}</h1>
        <p>
          Status: <code data-testid="app-status">{this.state.status}</code>
        </p>
        {this.renderUI()}
      </>
    );
  }
}

export default DemoClientApp;
