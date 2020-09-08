import React, { useState, useEffect } from "react";
import {
  Session as AuthSession,
  getClientAuthenticationWithDependencies
} from "@inrupt/solid-client-authn-browser";

// const REDIRECT_URL = "https://podpecker.zwifi.eu"
// const REDIRECT_URL = "http://localhost:3000";
const REDIRECT_URL = "https://ycos2.csb.app/";

export default function Home() {
  // eslint-disable-next-line
  const [session, setSession] = useState(
    new AuthSession(
      {
        clientAuthentication: getClientAuthenticationWithDependencies({})
      },
      "mySession"
    )
  );
  const [issuer, setIssuer] = useState("https://broker.demo-ess.inrupt.com/");
  const [oidc, setOidc] = useState("awaiting_login");
  const [resource, setResource] = useState(session.info.webId);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (oidc === "login_sent") {
      session.login({
        redirectUrl: new URL(REDIRECT_URL),
        oidcIssuer: new URL(issuer)
      });
    }
  }, [oidc, issuer, session]);

  useEffect(() => {
    const authCode = new URL(window.location.href).searchParams.get("code");
    if (authCode) {
      console.log("Being redirected from the IdP");
      session
        .handleIncomingRedirect(new URL(window.location.href))
        .then((info) => {
          setResource(info.webId);
        });
    }
  }, [session]);

  const handleLogin = (e) => {
    // The default behaviour of the button is to resubmit.
    // This prevents the page from reloading.
    e.preventDefault();
    setOidc("login_sent");
  };

  const handleFetch = (e) => {
    // The default behaviour of the button is to resubmit.
    // This prevents the page from reloading.
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
        <p>
          {session.info.webId
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
