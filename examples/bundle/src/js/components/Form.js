import React, { Component } from "react";
import "regenerator-runtime/runtime";

import experiment from "../../../../../dist/experiment";

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: ""
    };
  }

  async componentDidMount() {
    const token = await (await experiment()).getToken();
    this.setState({ token });
  }

  render() {
    return (
      <form>
        <h1>Solid Auth Fetcher Demo Page</h1>
        <p>Token {this.state.token}</p>
      </form>
    );
  }
}

export default Form;
