import React, { Component } from "react";
import "regenerator-runtime/runtime";

import fetcher, {
  login,
  getSession,
  handleRedirect
} from "../../../../../dist/index";

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "loading",
      loginIssuer: "http://localhost:8080/"
    };
    this.handleLogin = this.handleLogin.bind(this);
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
      }
    } else {
      this.setState({ status: "dashboard", session });
    }
  }

  async handleLogin(e) {
    e.preventDefault();
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
          <form>
            <h1>Solid Auth Fetcher Demo Dashboad</h1>
          </form>
        );
    }
  }
}

export default Form;
