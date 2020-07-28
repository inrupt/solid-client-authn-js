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

import { Session } from "../../../../dist/index";
import getAuthFetcher from "../../../../dist/dependencies";

class App extends Component {
  constructor(props) {
    super(props);
    const fetcher = getAuthFetcher({});
    const session = new Session({
      authFetcher: fetcher
    });
    this.state = {
      status: "loading",
      loginIssuer: "https://dev.inrupt.net",
      fetchRoute: "https://jackson.dev.inrupt.net/private",
      fetchBody: "",
      session: session,
      sessionInfo: {
        isLoggedIn: session.isLoggedIn,
        webid: session.webid
      }
    };
    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
    }
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleFetch = this.handleFetch.bind(this);
  }

  async componentDidMount() {
    console.log("coucou");
    if (window.location.pathname === "/popup") {
      this.state.status = "popup";
      setTimeout(() => window.close(), 2000);
    } else if (!this.state.session.isLoggedIn) {
      console.log("coucou2");
      const authCode = new URL(window.location.href).searchParams.get("code");
      if (!authCode) {
        console.log("coucou3");
        this.setState({ status: "login" });
      } else {
        console.log("coucou4");
        const sessionInfo = await this.state.session.handleIncomingRedirect(
          new URL(window.location.href)
        );
        console.log(JSON.stringify(sessionInfo, null, "  "));
        this.setState({ status: "dashboard", sessionInfo: sessionInfo });
      }
    } else {
      console.log("coucou4");
      this.setState({ status: "dashboard", session });
    }
  }

  async handleLogin(e, isPopup = false) {
    e.preventDefault();
    this.setState({ status: "loading" });
    console.log(`Trying to log in to ${this.state.loginIssuer}`);
    this.state.session
      .login({
        redirectUrl: "http://localhost:3001/",
        oidcIssuer: this.state.loginIssuer
      })
      .then(() => {
        console.log("coucou5");
        this.setState({ status: "dashboard" });
      });
  }

  async handleLogout(e) {
    e.preventDefault();
    this.setState({ status: "loading" });
    await this.state.session.logout();
    this.setState({
      status: "login",
      fetchBody: "",
      session: null
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
        return <h1>Loading</h1>;
      case "login":
        return (
          <form>
            <h1>Solid Auth Fetcher Multi Session API Demo Login</h1>
            <input
              type="text"
              value={this.state.loginIssuer}
              onChange={e => this.setState({ loginIssuer: e.target.value })}
            />
            <button onClick={this.handleLogin}>Log In</button>
          </form>
        );
      case "dashboard":
        return (
          <div>
            <h1>Solid Auth Fetcher Multi Session API Demo Dashboad</h1>
            <p>WebId: {this.state.sessionInfo.webid}</p>
            <form>
              <input
                type="text"
                value={this.state.fetchRoute}
                onChange={e => this.setState({ fetchRoute: e.target.value })}
              />
              <button onClick={this.handleFetch}>Fetch</button>
              <pre>{this.state.fetchBody}</pre>
            </form>
            <form>
              <button onClick={this.handleLogout}>Log Out</button>
            </form>
          </div>
        );
    }
  }
}

export default App;
