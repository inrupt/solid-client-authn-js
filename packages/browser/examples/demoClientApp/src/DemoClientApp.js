/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, { Component } from "react";
import "regenerator-runtime/runtime";

// import {
//   Session,
//   getClientAuthenticationWithDependencies,
// } from "@inrupt/solid-client-authn-browser";
import { Session } from "../../../dist/Session";
import { getClientAuthenticationWithDependencies } from "../../../dist/dependencies";

const clientApplicationName = "S-C-A Browser Demo Client App";
let snackBarTimeout = undefined;
let identityProviderLogoutEndpointTimeout = null;

const defaultLocalClientAppSessionId = "my local session id";

// TODO: PMCB55: make demo's 'prettier' by avoiding 'localhost'...
// const defaultClientEndpoint = "http://my-demo-app.com/";
const defaultClientEndpoint = "http://localhost:3001/";

// // ESS Broker - Demo (backed by GitHub)
// // GitHub Test Account:
// //   EMail: broker-demo@inrupt.com
// //   Username: inrupt-broker-tester
// //   Password: ?????
// const defaultIssuer = "https://broker.demo-ess.inrupt.com/";
// const defaultProtectedResource =
//   "https://ldp.demo-ess.inrupt.com/github_961445/private/";
//
// // ESS Broker - Demo (backed by Google - patm@inrupt.com account)
// // Google Test Account:
// //   EMail: broker-demo@inrupt.com
// //   Username: broker-demo@inrupt.com
// //   Password: ????? (in 1Password)
// const defaultIssuer = "https://broker.demo-ess.inrupt.com/";
// const defaultProtectedResource =
//   "https://ldp.demo-ess.inrupt.com/110592712913443799002/private/";
//
// ESS Broker - Prod (backed by Gluu)
// Username: sdktestuser
// Password: ????? (in 1Password - search for username, or 'Gluu')
const defaultIssuer = "https://broker.pod.inrupt.com/";
const defaultProtectedResource =
  "https://ldp.pod.inrupt.com/sdktestuser/private/";

// // NSS
// const defaultIssuer = "https://inrupt.net/";
// const defaultProtectedResource =
//   "https://pmcb55.inrupt.net/private/privateTest.ttl"; // NSS pmcb55 - Private resource

const style = {
  display: "inline-block",
  background: "#A0C5E8",
  padding: "5px",
};

class DemoClientApp extends Component {
  constructor(props) {
    super(props);

    // const sessionManager = new SessionManager();
    // const session = sessionManager.getSession(defaultLocalClientAppSessionId);
    // I actually want to be able to create multiple sessions, so I guess we
    // should use the SessionManager, but for now we just hard-code the one...
    const session = new Session(
      {
        clientAuthentication: getClientAuthenticationWithDependencies({}),
      },
      defaultLocalClientAppSessionId
    );

    this.state = {
      status: "loading",
      loginIssuer: defaultIssuer,
      clearClientRegistrationInfo: true,
      fetchRoute: defaultProtectedResource,
      fetchBody: "",
      session: session,
      sessionInfo: session.info, // FIXME: shouldn't duplicate this info!
    };

    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
    }

    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleOpenIdentityProvider = this.handleOpenIdentityProvider.bind(
      this
    );
    this.handleLogoutIdentityProvider = this.handleLogoutIdentityProvider.bind(
      this
    );
    this.handleFetch = this.handleFetch.bind(this);
  }

  async componentDidMount() {
    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
      setTimeout(() => window.close(), 2000);
    } else if (this.state.session.isLoggedIn) {
      this.setState({ status: "dashboard", session });
    } else {
      // Depending on which flow login uses, the response will either be "code" or "access_token".
      const authCode =
        new URL(window.location.href).searchParams.get("code") ||
        // FIXME: Temporarily handle both auth code and implicit flow.
        // Should be either removed or refactored.
        new URL(window.location.href).searchParams.get("access_token");

      if (!authCode) {
        this.setState({
          status: "login",
        });
      } else {
        try {
          const sessionInfo = await this.state.session.handleIncomingRedirect(
            new URL(window.location.href)
          );

          this.setState({
            status: "dashboard",
            sessionInfo: sessionInfo,
            fetchRoute: defaultProtectedResource,
          });
        } catch (error) {
          console.log(
            `Error attempting to handle what looks like an incoming OAuth2 redirect - could just be a user hitting the 'back' key to a previous redirect (since that previous code will no longer be valid!): ${error}`
          );
          this.setState({
            status: "login",
          });
        }
      }
    }

    this.lookupIdentityProviderConfig(this.state.loginIssuer);
  }

  async handleLogin(e, isPopup = false) {
    e.preventDefault();
    this.setState({ status: "loading" });

    if (this.state.clearClientRegistrationInfo) {
      window.localStorage.clear(
        "solidClientAuthenticationUser:clientApplicationRegistrationInfo"
      );
    }

    await this.state.session.login({
      redirectUrl: new URL(document.location.href),
      oidcIssuer: new URL(this.state.loginIssuer),
      clientName: clientApplicationName,
    });
  }

  handleOpenIdentityProvider(e) {
    e.preventDefault();

    console.log(
      `Opening new window for Identity Provider at: [${this.state.loginIssuer}]`
    );

    this.openNewWindow(this.state.loginIssuer);
  }

  async handleLogoutIdentityProvider(e) {
    e.preventDefault();

    const config = await this.lookupIdentityProviderConfig(
      this.state.loginIssuer
    );
    const endSessionEndpoint = config.end_session_endpoint;

    console.log(
      `Opening new window for Identity Provider Logout at: [${endSessionEndpoint}]`
    );

    this.openNewWindow(endSessionEndpoint);
  }

  async handleLogout(e) {
    e.preventDefault();
    this.setState({ status: "loading" });
    await this.state.session.logout();

    this.hasIdentityProviderLogout(this.state.loginIssuer);

    this.setState({
      status: "login",
      fetchBody: "",
    });
  }

  async handleFetch(e) {
    e.preventDefault();
    this.setState({ status: "loading", fetchBody: "" });
    const response = await (
      await this.state.session.fetch(this.state.fetchRoute, {})
    ).text();

    if (this.state.session.isLoggedIn) {
      this.setState({ status: "dashboard", fetchBody: response });
    } else {
      this.setState({ status: "login", fetchBody: response });
    }

    // this.lookupIdentityProviderConfig(this.state.loginIssuer);
  }

  highlightPartOfWebId(webId, part) {
    // Example: https://ldp.demo-ess.inrupt.com/110592712913443799002/profile/card#me
    let result;
    switch (part) {
      case 0:
        result = webId.substring(0, webId.indexOf(".com/") + 5);
        break;
      case 1:
        result = webId.substring(
          webId.indexOf(".com/") + 5,
          webId.indexOf("/profile/")
        );
        break;
      case 2:
        result = webId.substring(webId.indexOf("/profile/"));
        break;
    }

    return result;
  }

  displaySnackBar(text) {
    const snackBar = document.getElementById("snackbar");
    snackBar.className = "show";
    snackBar.innerHTML = text;
    if (snackBarTimeout) {
      clearTimeout(snackBarTimeout);
    }
    snackBarTimeout = setTimeout(function () {
      snackBar.className = snackBar.className.replace("show", "");
    }, 3000);
  }

  identityProviderConfigUrl(url) {
    return `${url}${
      url.endsWith("/") ? "" : "/"
    }.well-known/openid-configuration`;
  }

  hasIdentityProviderLogout(url) {
    if (identityProviderLogoutEndpointTimeout != null) {
      clearTimeout(identityProviderLogoutEndpointTimeout);
    }

    identityProviderLogoutEndpointTimeout = setTimeout(() => {
      identityProviderLogoutEndpointTimeout = null;
      this.lookupIdentityProviderConfig(url);
    }, 200);
  }

  async lookupIdentityProviderConfig(url) {
    const idpConfigEndpoint = this.identityProviderConfigUrl(url);
    return window
      .fetch(idpConfigEndpoint)
      .then((response) => response.json())
      .then((result) => {
        if (result.end_session_endpoint) {
          console.log(
            `Endpoint [${idpConfigEndpoint}] has 'end_session_endpoint' [${result.end_session_endpoint}]`
          );
          document.getElementById("open_idp_button").disabled = false;
          document.getElementById("logout_idp_button").disabled = false;
        } else {
          console.log(
            `Endpoint [${idpConfigEndpoint}] is good, but doesn't provide an 'end_session_endpoint'`
          );
          document.getElementById("open_idp_button").disabled = true;
          document.getElementById("logout_idp_button").disabled = true;
        }

        if (result.userinfo_endpoint) {
          console.log(
            `Endpoint [${idpConfigEndpoint}] has 'userinfo_endpoint' [${result.userinfo_endpoint}]`
          );

          if (result.userinfo_endpoint.startsWith("https://inrupt.net")) {
            const message = `Identity Provider is NSS, but it's support for user information is currently broken - so we can't verify the current \`id_token\` against the identity provider.`;
            console.log(message);
            document.getElementById("idp_userinfo").innerHTML = message;
          } else {
            this.state.session
              .fetch(result.userinfo_endpoint)
              .then((response) => {
                if (response.status !== 200) {
                  throw new Error(
                    `Failed to retrieve userinfo from identity provider, status: [${response.status}]`
                  );
                }

                return response.json();
              })
              .then((result) => {
                const loggedInAs = result.sub;
                console.log(
                  `Currently logged into Identity Provider [${url}] as user [${loggedInAs}]`
                );
                document.getElementById(
                  "idp_userinfo"
                ).innerHTML = `Logged into Identity Provider as user: [${loggedInAs}]`;
              })
              .catch((error) => {
                console.log(
                  `Seems we're not currently logged into our Identity Provider [${url}]: ${error}`
                );
                document.getElementById(
                  "idp_userinfo"
                ).innerHTML = `Not logged into Identity Provider`;
              });
          }
        } else {
          console.log(
            `Endpoint [${idpConfigEndpoint}] is good, but doesn't provide an 'userinfo_endpoint'`
          );
          document.getElementById(
            "idp_userinfo"
          ).innerHTML = `Identity Provider doesn't provide access to currently logged-in user information`;
        }

        return result;
      })
      .catch((error) => {
        console.error(
          `It appears that [${idpConfigEndpoint}] is not a valid Identity Provider configuration endpoint: ${error}`
        );
        document.getElementById("open_idp_button").disabled = true;
        document.getElementById("logout_idp_button").disabled = true;
        return undefined;
      });
  }

  openNewWindow(url) {
    window.open(
      url,
      "_blank",
      "height=500,width=1200,top=400,modal=yes,alwaysRaised=yes,toolbar=0,menubar=0"
    );
  }

  htmlLogin() {
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
            </span>
          </div>
          <input
            id="identity_provider_textbox"
            type="text"
            size="80"
            value={this.state.loginIssuer}
            onChange={(e) => {
              this.setState({ loginIssuer: e.target.value });
              this.hasIdentityProviderLogout(e.target.value);
            }}
          />
          &nbsp;
          <button id="login_button" onClick={this.handleLogin}>
            Log In
          </button>
        </div>

        <div className="tooltip">
          <div>
            <input
              id="reauthorize_client_app"
              type="checkbox"
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
            <label htmlFor="reauthorize_client_app">
              Re-authorize this client application on Login
            </label>
            &nbsp;<i className="fa fa-info-circle"></i>
          </div>

          <span className="tooltiptext">
            Re-authorize this Client Application on Login.
            <p></p>
            For example, to change the access permissions you may have already
            granted to this application.
          </span>
        </div>
      </div>
    );
  }

  htmlFetchResource() {
    return (
      <form>
        <div style={style}>
          <input
            id="fetch_uri_textbox"
            size="80"
            type="text"
            value={this.state.fetchRoute}
            onChange={(e) => this.setState({ fetchRoute: e.target.value })}
          />
          <button id="fetch_button" onClick={this.handleFetch}>
            Fetch
          </button>
        </div>
        <br></br>
        <div style={style}>
          <strong>Resource:</strong>
          <pre id="fetch_response_textbox">{this.state.fetchBody}</pre>
        </div>
      </form>
    );
  }

  htmlLogout() {
    console.log(
      `Current logged in state: [${this.state.session.info.isLoggedIn}]`
    );

    return (
      <div style={style}>
        <p></p>
        <div>
          <div className="tooltip">
            <form>
              <button
                id="logout_button"
                onClick={this.handleLogout}
                disabled={!this.state.session.info.isLoggedIn}
              >
                Log Out
              </button>
              &nbsp;<i className="fa fa-info-circle"></i>
            </form>
            <span className="tooltiptext">
              Log out of this client application.
              <p></p>
              NOTE: This button is only enabled if you are currently logged in.
            </span>
          </div>
        </div>

        <div className="tooltip">
          <div>
            Popup Identity Provider:{" "}
            {/*<a target="_blank" href={this.state.loginIssuer}>*/}
            {/*  {this.state.loginIssuer}*/}
            {/*</a>*/}
            <button
              id="open_idp_button"
              onClick={this.handleOpenIdentityProvider}
            >
              Open Identity Provider
            </button>
            &nbsp;<i className="fa fa-info-circle"></i>
            &nbsp;
          </div>

          <span className="tooltiptext">
            Allows you to see authorizations you've granted, and to log out
            (maybe you'd like to log in again using a different account).
          </span>
        </div>

        <div className="tooltip">
          <div>
            <button
              id="logout_idp_button"
              onClick={this.handleLogoutIdentityProvider}
            >
              Logout from Identity Provider
            </button>
            &nbsp;<i className="fa fa-info-circle"></i>
          </div>

          <span className="tooltiptext">
            Jump to 'Logout' endpoint for currently entered Identity Provider.
            <p></p>
            NOTE: This button is only enabled if the currently entered Identity
            Provider exposes an 'end_session_endpoint' value at: [
            {this.identityProviderConfigUrl(this.state.loginIssuer)}]
          </span>
        </div>

        <div>
          <span id="idp_userinfo"></span>
        </div>
      </div>
    );
  }

  render() {
    switch (this.state.status) {
      case "popup":
        return <h1>Popup Redirected</h1>;

      case "loading":
        return <h1>Loading...</h1>;

      case "login":
        return (
          <div>
            <div id="snackbar">--- Text written here dynamically ---</div>

            <h1>{clientApplicationName}</h1>
            {this.htmlLogin()}

            <p></p>
            {this.htmlFetchResource()}

            <p></p>
            {this.htmlLogout()}
          </div>
        );

      case "dashboard":
        return (
          <div>
            <h1>
              {clientApplicationName}
              <p></p>
              Authenticated! Ready to browse...
            </h1>
            <p>
              <strong>WebID:</strong>{" "}
              {this.highlightPartOfWebId(this.state.sessionInfo.webId, 0)}
              <span style={{ color: "red", fontSize: "18px" }}>
                <strong>
                  {this.highlightPartOfWebId(this.state.sessionInfo.webId, 1)}
                </strong>
              </span>
              {this.highlightPartOfWebId(this.state.sessionInfo.webId, 2)}
            </p>

            {this.htmlFetchResource()}

            {this.htmlLogout()}
          </div>
        );
    }
  }
}

export default DemoClientApp;
