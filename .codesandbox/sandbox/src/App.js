import React, { useState, useEffect } from "react";
import * as defaultSession from "@inrupt/solid-client-authn-browser";

const {
  login,
  handleIncomingRedirect,
  fetch: authenticatedFetch,
  getDefaultSession,
} = defaultSession;

const REDIRECT_URL = window.location;

export default function Home() {
  const [issuer, setIssuer] = useState("https://broker.pod.inrupt.com/");
  const [resource, setResource] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const authCode = new URL(window.location.href).searchParams.get("code");
    if (authCode) {
      console.log("Being redirected from the IdP");
      handleIncomingRedirect(window.location.href).then((info) => {
        setResource(info.webId);
      });
    }
  });

  const handleLogin = (e) => {
    // The default behaviour of the button is to resubmit.
    // This prevents the page from reloading.
    e.preventDefault();
    login({
      redirectUrl: REDIRECT_URL,
      oidcIssuer: issuer,
    });
  };

  const handleFetch = (e) => {
    // The default behaviour of the button is to resubmit.
    // This prevents the page from reloading.
    e.preventDefault();
    authenticatedFetch(resource)
      .then((response) => response.text())
      .then(setData);
  };

  const session = getDefaultSession();

  return (
    <div>
      <main>
        <h1>Sandbox app</h1>
        <p>
          {session?.info?.webId
            ? `Logged in as ${session.info.webId}`
            : "Not logged in yet"}{" "}
        </p>
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
