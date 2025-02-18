//
// Copyright Inrupt Inc.
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

import React, { useState, useEffect } from "react";
import "regenerator-runtime/runtime";

import {
  login,
  logout,
  handleIncomingRedirect,
  fetch,
  getDefaultSession,
  events,
  EVENTS,
} from "@inrupt/solid-client-authn-browser";

const REDIRECT_URL = "http://localhost:3113/";
// This is an example IRI where the Client identifier document (i.e. ../client-app-profile.jsonld)
// is available to the OIDC issuer. See https://solid.github.io/solid-oidc/#clientids-document
// for more information. Note that the URL of the document should match its `client_id` field.
// const CLIENT_IDENTIFIER = "https://example.org/your-client-id";

export default function App() {
  const [webId, setWebId] = useState(getDefaultSession().info.webId);
  const [issuer, setIssuer] = useState("https://login.inrupt.com/");
  const [resource, setResource] = useState(webId);
  const [data, setData] = useState(null);

  // The useEffect hook is executed on page load, and in particular when the user
  // is redirected to the page after logging in the identity provider.
  useEffect(() => {
    // After redirect, the current URL contains login information.
    handleIncomingRedirect({
      restorePreviousSession: true,
    }).then((info) => {
      setWebId(info.webId);
      setResource(webId);
    });
  }, [webId]);

  const errorHandle = (error, errorDescription) => {
    console.log(`${error} has occured: `, errorDescription);
  };

  events().on(EVENTS.ERROR, errorHandle);

  const handleLogin = () => {
    // Login will redirect the user away so that they can log in the OIDC issuer,
    // and back to the provided redirect URL (which should be controlled by your app).
    login({
      redirectUrl: REDIRECT_URL,
      oidcIssuer: issuer,
      clientName: "Demo app",
      // clientId: CLIENT_IDENTIFIER,
    });
  };

  const handleLogout = () => {
    logout();
    // The following has no impact on the logout, it just resets the UI.
    setWebId(undefined);
    setData("");
    setResource("");
  };

  const handleFetch = () => {
    fetch(resource, { headers: new Headers({ Accept: "text/turtle" }) })
      .then((response) => response.text())
      .then(setData);
  };

  return (
    <main>
      <h1>Sandbox app</h1>
      <p>{webId ? `Logged in as ${webId}` : "Not logged in yet"}</p>
      <form>
        <input
          type="text"
          value={issuer}
          onChange={(e) => {
            setIssuer(e.target.value);
          }}
        />
        <button type="button" onClick={handleLogin}>
          Log In
        </button>
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      </form>
      <hr />
      <input
        type="text"
        value={resource}
        onChange={(e) => {
          setIssuer(e.target.value);
        }}
      />
      <button type="button" onClick={handleFetch}>
        Fetch
      </button>
      <pre>{data}</pre>
    </main>
  );
}
