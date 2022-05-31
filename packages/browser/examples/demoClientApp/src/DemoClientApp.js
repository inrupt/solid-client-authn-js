import React, { Component } from "react";
import "regenerator-runtime/runtime";

import {
  Session,
  getClientAuthenticationWithDependencies,
} from "@inrupt/solid-client-authn-browser";

const clientApplicationName = "S-C-A Browser Demo Client App";
let snackBarTimeout = undefined;
let identityProviderLogoutEndpointTimeout = null;

const NSS_SERVER_URL = "https://inrupt.net/";

const preconfiguedIdpList = [
  "https://openid.dev-next.inrupt.com/",
  "https://broker.pod.inrupt.com/",
  "https://broker.dev-ess.inrupt.com/",
  "https://broker.demo-ess.inrupt.com/",
  "https://inrupt.net/",
];

const defaultIssuer = preconfiguedIdpList[1];

const style = {
  display: "block",
  background: "#A0C5E8",
  padding: "5px",
  margin: "0 0 1em 0",
};

// FIXME: temporary hack to get access to the clientAuthentication instance to retrieve the IdP URL
// replace with getDefaultSession once the issuer is exposed in ISessionInfo
let session, clientAuthentication;
function getSession() {
  if (!session) {
    clientAuthentication = getClientAuthenticationWithDependencies({});
    session = new Session({
      clientAuthentication: clientAuthentication,
    });
  }

  return session;
}

function identityProviderConfigUrl(url) {
  return `${url}${
    url.endsWith("/") ? "" : "/"
  }.well-known/openid-configuration`;
}

// This exists in IssuerConfigFetcher, but isn't publicly accessible:
async function fetchIdentityProviderConfig(idpConfigEndpoint) {
  return fetch(idpConfigEndpoint).then((response) => response.json());
}

/**
 * Very hacky attempt at splitting a WebID into 'components', such that:
 *  prefix: is up to, but not including, the username part of the WebID.
 *  identifier: is just the username part of the WebID.
 *  suffix: is everything after the username part of the WebID.
 *
 * Example: https://ldp.demo-ess.inrupt.com/110592712913443799002/profile/card#me
 *  prefix is "https://ldp.demo-ess.inrupt.com/".
 *  identifier is "110592712913443799002".
 *  suffix is "/profile/card#me".
 */
function extractWebIdComponents(webId) {
  const webIdUrl = new URL(webId);
  const result = { prefix: null, identifier: null, suffix: null };

  result.prefix = new URL("/", webIdUrl).toString();

  if (webId.endsWith("/profile/card#me")) {
    // ESS 1.1:
    const suffixIndex = webIdUrl.pathname.indexOf("/profile/");

    result.identifier = webIdUrl.pathname.slice(1, suffixIndex);
    result.suffix = webIdUrl.pathname.slice(suffixIndex) + webIdUrl.hash;
  } else {
    // ESS 1.2:
    // There is no suffix for ESS 1.2 WebIds
    result.identifier = webIdUrl.pathname.substring(1);
  }

  // NSS on Inrupt.net uses subdomains, so we need to trim the trailing slash on the prefix:
  if (
    !result.identifier &&
    result.prefix &&
    result.suffix &&
    result.prefix.endsWith("/")
  ) {
    result.prefix = result.prefix.substring(0, result.prefix.length - 1);
  }

  return result;
}

function openNewWindow(url) {
  const top = (window.outerHeight - 500) / 2;
  const left = (window.outerWidth - 1200) / 2;
  window.open(
    url,
    "_blank",
    `height=500,width=1200,top=${top},left=${left},modal=yes,alwaysRaised=yes,toolbar=0,menubar=0`
  );
}

class DemoClientApp extends Component {
  constructor(props) {
    super(props);

    const session = getSession();

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
      loginIssuer: defaultIssuer,
      clearClientRegistrationInfo: true,
      fetchRoute: "",
      fetchLoading: false,
      fetchBody: null,
      idpConfig: null,
      idpUserInfo: null,
      enableIdpButtons: false,
    };

    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
    }

    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleFetchIdentityProviderConfig =
      this.handleFetchIdentityProviderConfig.bind(this);
    this.handleOpenIdentityProvider =
      this.handleOpenIdentityProvider.bind(this);
    this.handleLogoutIdentityProvider =
      this.handleLogoutIdentityProvider.bind(this);
    this.handleFetch = this.handleFetch.bind(this);
  }

  async componentDidMount() {
    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
      setTimeout(() => window.close(), 2000);
    } else {
      const session = getSession();

      // restore the existing session or handle the redirect from login:
      await session.handleIncomingRedirect({
        restorePreviousSession: true,
      });

      if (!session.info.isLoggedIn) {
        this.setState({ status: "login" });
      } else {
        this.onLoginOrRestore();
      }
    }
  }

  async onLoginOrRestore() {
    const session = getSession();

    if (!session.info.isLoggedIn) {
      this.setState({ status: "login" });
    } else {
      // FIXME: remove once issuer is provided in ISessionInfo:
      const fullSessionInfo = await clientAuthentication.getSessionInfo(
        session.info.sessionId
      );

      this.setState({
        status: "dashboard",
        loginIssuer: fullSessionInfo.issuer,
        fetchRoute: "",
      });

      this.fetchIdentityProviderInfo(fullSessionInfo.issuer);
    }
  }

  async handleLogin(e, isPopup = false) {
    e.preventDefault();
    this.setState({ status: "loading" });

    if (this.state.clearClientRegistrationInfo) {
      window.localStorage.clear(
        "solidClientAuthenticationUser:clientApplicationRegistrationInfo"
      );
    }

    const session = getSession();

    await session.login({
      redirectUrl: document.location.href,
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

  handleOpenIdentityProvider(e) {
    e.preventDefault();

    console.log(
      `Opening new window for Identity Provider at: [${this.state.loginIssuer}]`
    );

    openNewWindow(this.state.loginIssuer);
  }

  async handleLogoutIdentityProvider(e) {
    e.preventDefault();

    const config = await fetchIdentityProviderConfig(
      identityProviderConfigUrl(this.state.loginIssuer)
    );

    // ESS 1.1 requires the `post_logout_redirect_uri` to be set:
    const redirectUri = new URL("/popup", document.location.href);
    const endSessionUrl = new URL(config.end_session_endpoint);
    endSessionUrl.searchParams.set(
      "post_logout_redirect_uri",
      redirectUri.toString()
    );

    console.log(
      `Opening new window for Identity Provider Logout at: [${endSessionUrl}]`
    );

    openNewWindow(endSessionUrl);

    // Calling explicitly because the logout happens in the popup:
    setTimeout(async () => {
      const session = getSession();
      await session.logout();

      this.setState({ enableIdpButtons: false });
    }, 1000);
  }

  handleLogout(e) {
    e.preventDefault();
    this.performLogout();
  }

  async performLogout() {
    this.setState({ status: "loading" });

    const session = getSession();
    await session.logout();

    this.hasIdentityProviderLogout(this.state.loginIssuer);

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
      const session = getSession();
      const response = await (
        await session.fetch(this.state.fetchRoute, {})
      ).text();

      this.setState({ fetchBody: response, fetchLoading: false });
      this.fetchIdentityProviderInfo(this.state.loginIssuer);
    } catch (err) {
      this.setState({ fetchLoading: false });
    }
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

  hasIdentityProviderLogout(url) {
    if (identityProviderLogoutEndpointTimeout != null) {
      clearTimeout(identityProviderLogoutEndpointTimeout);
    }

    identityProviderLogoutEndpointTimeout = setTimeout(() => {
      identityProviderLogoutEndpointTimeout = null;
      this.fetchIdentityProviderInfo(url);
    }, 200);
  }
  async fetchIdentityProviderInfo(url) {
    const session = getSession();
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
            size="80"
            value={this.state.loginIssuer}
            onChange={(e) => {
              this.setState({ loginIssuer: e.target.value, idpConfig: null });
              this.hasIdentityProviderLogout(e.target.value);
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
            size="80"
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
    const session = getSession();
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
              {/*<a target="_blank" href={this.state.loginIssuer}>*/}
              {/*  {this.state.loginIssuer}*/}
              {/*</a>*/}
              <button
                onClick={this.handleOpenIdentityProvider}
                disabled={!this.state.enableIdpButtons}
              >
                Open Identity Provider Popup
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
                onClick={this.handleLogoutIdentityProvider}
                disabled={!this.state.enableIdpButtons}
              >
                Logout from Identity Provider
              </button>
              &nbsp;<i className="fa fa-info-circle"></i>
              &nbsp;
            </div>

            <span className="tooltiptext">
              Jump to 'Logout' endpoint for currently entered Identity Provider.
              <p></p>
              NOTE: This button is only enabled if the currently entered
              Identity Provider exposes an 'end_session_endpoint' value at: [
              {identityProviderConfigUrl(this.state.loginIssuer)}]
            </span>
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

  renderPopupMessage() {
    return (
      <>
        <h1>Popup Redirected</h1>
        <p>Will automatically close in 2 seconds</p>
      </>
    );
  }
  renderDashboard(session) {
    const webId = extractWebIdComponents(session.info.webId);
    return (
      <div>
        <div style={style}>
          <h2>Authenticated! Ready to browse...</h2>
          <p>
            <strong>Session Provider:</strong>{" "}
            <code>{this.state.loginIssuer}</code>
          </p>
          <p>
            <strong>WebID:</strong>{" "}
            <code>
              {webId.prefix}
              <span style={{ color: "darkblue" }}>
                <strong>{webId.identifier}</strong>
              </span>
              {webId.suffix}
            </code>
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
      case "popup":
        return this.renderPopupMessage();
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
        return this.renderDashboard(getSession());
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
