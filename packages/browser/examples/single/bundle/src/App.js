/**
 * Copyright 2021 Inrupt Inc.
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

import React, { useState, useEffect } from "react";
import "regenerator-runtime/runtime";

import { Session } from "../../../../dist/index";

const REDIRECT_URL = window.location;

export default function App() {
  const [session, setSession] = useState(new Session());
  const [webId, setWebId] = useState(session.info.webId);
  const [issuer, setIssuer] = useState("https://broker.demo-ess.inrupt.com/");
  const [resource, setResource] = useState(webId);
  const [data, setData] = useState(null);

  // The useEffect hook is executed on page load, and in particular when the user
  // is redirected to the page after logging in the identity provider.
  useEffect(() => {
    // After redirect, the current URL contains login information.
    session.handleIncomingRedirect(window.location.href).then((info) => {
      setResource(info.webId);
      setWebId(info.webId);
    });
  }, [session]);

  const handleLogin = (e) => {
    // The default behaviour of the button is to resubmit.
    // This prevents the page from reloading.
    e.preventDefault();
    // Login will redirect the user away so that they can log in the OIDC issuer,
    // and back to the provided redirect URL (which should be controlled by your app).
    session.login({
      redirectUrl: REDIRECT_URL,
      oidcIssuer: issuer,
    });
  };

  const handleLogout = (e) => {
    e.preventDefault();
    session.logout();
    // The following has no impact on the logout, it just resets the UI.
    setWebId(undefined);
    setData("");
    setResource("");
  };

  const handleFetch = (e) => {
    e.preventDefault();
    session
      .fetch(resource)
      .then((response) => response.text())
      .then(setData);
  };

  return (
    <div>
      <main>
        <h1>Sandbox app</h1>
        <p>{webId ? `Logged in as ${webId}` : "Not logged in yet"}</p>
        <div>
          <form>
            <input
              type="text"
              value={issuer}
              onChange={(e) => {
                setIssuer(e.target.value);
              }}
            />
            <button onClick={(e) => handleLogin(e)}>Log In</button>
            <button onClick={(e) => handleLogout(e)}>Log Out</button>
          </form>
        </div>
        <hr />
        <div>
          <input
            type="text"
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
            }}
          />
          <button onClick={(e) => handleFetch(e)}>Fetch</button>
        </div>
        <pre>{data}</pre>
      </main>
    </div>
  );
}
