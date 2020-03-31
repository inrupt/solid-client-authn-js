import React, { Component } from "react";
import "regenerator-runtime/runtime";

import fetcher, {
  login,
  getSession,
  handleRedirect,
  logout,
  fetch
} from "../../../../../dist/index";

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "loading",
      loginIssuer: "http://localhost:8080/",
      fetchBody: "",
      session: null
    };
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleFetch = this.handleFetch.bind(this);
  }

  async componentDidMount() {
    const session = await getSession();
    if (!session) {
      const authCode = new URL(window.location.href).searchParams.get("code");
      if (!authCode) {
        this.setState({ status: "login" });
      } else {
        const session = await handleRedirect(window.location.href);
        this.setState({ status: "dashboard", session });
        window.location.replace(new URL(window.location.href).origin);
      }
    } else {
      this.setState({ status: "dashboard", session });
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    this.setState({ status: "loading" });
    const session = await login({
      clientId: "coolApp",
      redirect: "http://localhost:3001/",
      oidcIssuer: this.state.loginIssuer
    });
    if (
      session.neededAction &&
      session.neededAction.actionType === "redirect"
    ) {
      window.location.href = session.neededAction.redirectUrl;
    }
  }

  async handleLogout(e) {
    e.preventDefault();
    this.setState({ status: "loading" });
    await logout();
    this.setState({ status: "login", session: null });
  }

  async handleFetch(e) {
    e.preventDefault();
    this.setState({ status: "loading", fetchBody: "" });
    const response = await (
      await fetch("http://localhost:9001/storage", {})
    ).text();
    this.setState({ status: "dashboard", fetchBody: response });
  }

  render() {
    switch (this.state.status) {
      case "loading":
        return <h1>Loading</h1>;
      case "login":
        return (
          <form>
            <h1>Solid Auth Fetcher Demo Login</h1>
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
            <h1>Solid Auth Fetcher Demo Dashboad</h1>
            <p>WebId: {this.state.session.webId}</p>
            <form>
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

export default Form;
