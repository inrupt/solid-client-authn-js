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

import {
  login,
  logout,
  handleIncomingRedirect,
  fetch,
  getDefaultSession,
} from "../../../../dist/index";

const REDIRECT_URL = "http://localhost:3113/";
const CLIENT_APP_WEBID =
  "https://raw.githubusercontent.com/inrupt/solid-client-authn-js/main/packages/browser/examples/single/bundle/client-app-profile.ttl#app";

export default function App() {
  const [webId, setWebId] = useState(getDefaultSession().info.webId);
  const [issuer, setIssuer] = useState("https://broker.pod.inrupt.com/");
  const [resource, setResource] = useState(webId);
  const [data, setData] = useState(null);
  const worker = new Worker(new URL("./worker.js", import.meta.url));

  // The useEffect hook is executed on page load, and in particular when the user
  // is redirected to the page after logging in the identity provider.
  useEffect(() => {
    // After redirect, the current URL contains login information.
    handleIncomingRedirect({
      restorePreviousSession: true,
      onError: errorHandle,
    }).then((info) => {
      setWebId(info.webId);
      setResource(webId);
    });
  }, [webId]);

  const errorHandle = (error, errorDescription) => {
    console.log(`${error} has occured: `, errorDescription);
  };

  const handleLogin = (e) => {
    // The default behaviour of the button is to resubmit.
    // This prevents the page from reloading.
    e.preventDefault();
    // Login will redirect the user away so that they can log in the OIDC issuer,
    // and back to the provided redirect URL (which should be controlled by your app).
    login({
      redirectUrl: REDIRECT_URL,
      oidcIssuer: issuer,
      clientName: "Demo app",
      clientId: CLIENT_APP_WEBID,
    });
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    // The following has no impact on the logout, it just resets the UI.
    setWebId(undefined);
    setData("");
    setResource("");
  };

  const handleFetch = (e) => {
    e.preventDefault();
    fetch(resource, { headers: new Headers({ Accept: "text/turtle" }) })
      .then((response) => response.text())
      .then(setData);
  };

  const handleFetchWorker = (e) => {
    e.preventDefault();

    worker.postMessage({ resource });
    worker.onmessage = ({ data: { text } }) => setData(text);
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
          <button onClick={(e) => handleFetchWorker(e)}>
            Fetch with Web Worker
          </button>
        </div>
        <pre>{data}</pre>
      </main>
    </div>
  );
}
