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
import { SessionManager } from "../../../dist";

const clientApplicationName =
  "Solid Client AuthN Browser Test Client Application";

const defaultLocalClientAppSessionId = "my local session id";
const defaultClientEndpoint = "http://localhost:3001/";
const defaultIssuer = "https://broker.demo-ess.inrupt.com/";
const defaultProtectedResource =
  "https://ldp.demo-ess.inrupt.com/110592712913443799002/private/End-2-End-Test/private-resource.ttl";

const style = {
  display: "inline-block",
  background: "#A0C5E8",
  padding: "5px",
};

class App extends Component {
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
      fetchRoute: "",
      fetchBody: "",
      session: session,
      sessionInfo: session.info, // FIXME: shouldn't duplicate this info!
    };

    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
    }

    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
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
        this.setState({ status: "login" });
      } else {
        const sessionInfo = await this.state.session.handleIncomingRedirect(
          new URL(window.location.href)
        );

        this.setState({
          status: "dashboard",
          sessionInfo: sessionInfo,
          // fetchRoute: sessionInfo.webId,
          fetchRoute: defaultProtectedResource,
        });
      }
    }
  }

  async handleLogin(e, isPopup = false) {
    e.preventDefault();
    this.setState({ status: "loading" });
    await this.state.session.login({
      redirectUrl: new URL(defaultClientEndpoint),
      oidcIssuer: new URL(this.state.loginIssuer),
      clientName: clientApplicationName,
    });
  }

  async handleLogout(e) {
    e.preventDefault();
    this.setState({ status: "loading" });
    await this.state.session.logout();
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
    this.setState({ status: "dashboard", fetchBody: response });
  }

  render() {
    switch (this.state.status) {
      case "popup":
        return <h1>Popup Redirected</h1>;

      case "loading":
        return <h1>Loading...</h1>;

      case "login":
        return (
          <form>
            <h1>solid-client-authn-browser API Demo - Login</h1>
            <div style={style}>
              <span>Login with your Identity Provider:</span>
              <input
                type="text"
                size="80"
                value={this.state.loginIssuer}
                onChange={(e) => this.setState({ loginIssuer: e.target.value })}
              />
              <button onClick={this.handleLogin}>Log In</button>
            </div>
          </form>
        );

      case "dashboard":
        return (
          <div>
            <h1>
              solid-client-authn-browser API Demo - Authenticated! Ready to
              browse...
            </h1>
            <p>
              <strong>WebID:</strong> {this.state.sessionInfo.webId}
            </p>
            <form>
              <div style={style}>
                <input
                  size="80"
                  type="text"
                  value={this.state.fetchRoute}
                  onChange={(e) =>
                    this.setState({ fetchRoute: e.target.value })
                  }
                />
                <button onClick={this.handleFetch}>Fetch</button>
              </div>
              <p></p>
              <div style={style}>
                <strong>Resource:</strong>
                <pre>{this.state.fetchBody}</pre>
              </div>
            </form>

            <p></p>
            <div>
              <form>
                <button onClick={this.handleLogout}>Log Out</button>
              </form>
            </div>
          </div>
        );
    }
  }
}

export default App;
