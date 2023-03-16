//
// Copyright 2022 Inrupt Inc.
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
import {
  TESTID_OPENID_PROVIDER_INPUT,
  TESTID_LOGIN_BUTTON,
  TESTID_LOGOUT_BUTTON,
  TESTID_ERROR_MESSAGE,
} from "@inrupt/internal-playwright-testids";
import {
  login,
  logout,
  handleIncomingRedirect,
  ISessionInfo,
  events,
  EVENTS,
} from "@inrupt/solid-client-authn-browser";
import AuthenticatedFetch from "../authenticatedFetch";

const REDIRECT_URL = new URL("http://localhost:3001/").href;
const APP_NAME = "Authn browser-based tests app";
const DEFAULT_ISSUER = "https://login.inrupt.com/";

const isValidUrl = (candidate?: string): boolean => {
  if (typeof candidate !== "string") {
    return false;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(candidate);
    return true;
  } catch (_e) {
    return false;
  }
};

export default function AppContainer() {
  const [sessionInfo, setSessionInfo] = useState<ISessionInfo>();
  const [issuer, setIssuer] = useState<string>(DEFAULT_ISSUER);
  const [clientId, setClientId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loginSignalReceived, setLoginSignalReceived] =
    useState<boolean>(false);
  const [logoutSignalReceived, setLogoutSignalReceived] =
    useState<boolean>(false);
  const [extensionSignalReceived, setExtensionSignalReceived] =
    useState<boolean>(false);
  const [expirationSignalReceived, setExpirationSignalReceived] =
    useState<boolean>(false);

  const onError = (error: string) => {
    setErrorMessage(error);
  };

  useEffect(() => {
    events().on(EVENTS.LOGIN, () => {
      setLoginSignalReceived(true);
    });

    events().on(EVENTS.LOGOUT, () => {
      setLogoutSignalReceived(true);
    });

    events().on(EVENTS.SESSION_EXTENDED, () => {
      setExtensionSignalReceived(true);
    });

    events().on(EVENTS.SESSION_EXPIRED, () => {
      setExpirationSignalReceived(true);
    });
  });

  useEffect(() => {
    handleIncomingRedirect({ restorePreviousSession: true })
      .then(setSessionInfo)
      .catch((e) => {
        onError(`Incoming redirect issue ${e.toString()}`);
      });
  }, []);

  const handleLogin = async () => {
    try {
      // Login will redirect the user away so that they can log in the OIDC issuer,
      // and back to the provided redirect URL (which should be controlled by your app).
      await login({
        redirectUrl: REDIRECT_URL,
        oidcIssuer: issuer,
        clientName: APP_NAME,
        // Only Solid-OIDC Client Identifiers are accepted here.
        clientId: isValidUrl(clientId) ? clientId : undefined,
      });
    } catch (err) {
      onError((err as Error).toString());
    }
  };

  const handleLogout = async () => {
    await logout();
    setSessionInfo(undefined);
  };

  return (
    <div>
      <h1>{APP_NAME}</h1>
      <p>
        {sessionInfo?.isLoggedIn ? (
          <span data-testid="loggedInStatus">
            Logged in as {sessionInfo.webId} using client{" "}
            {sessionInfo.clientAppId}.
          </span>
        ) : (
          <span data-testid="loggedOutStatus">Not logged in yet</span>
        )}
      </p>
      <form>
        <input
          data-testid={TESTID_OPENID_PROVIDER_INPUT}
          placeholder="OpenID Provider URL"
          type="text"
          value={issuer}
          onChange={(e) => {
            setIssuer(e.target.value);
          }}
        />
        <input
          data-testid="clientIdentifierInput"
          placeholder="Client Identifier"
          type="text"
          onChange={(e) => {
            setClientId(e.target.value);
          }}
        />
        <button
          data-testid={TESTID_LOGIN_BUTTON}
          onClick={async (e) => {
            e.preventDefault();
            await handleLogin();
          }}
        >
          Log In
        </button>
        <button
          data-testid={TESTID_LOGOUT_BUTTON}
          onClick={async (e) => {
            e.preventDefault();
            await handleLogout();
          }}
        >
          Log Out
        </button>
      </form>
      <p data-testid={TESTID_ERROR_MESSAGE}>
        <strong>{errorMessage}</strong>
      </p>
      <br />
      <table>
        <tr>
          <td>Signals</td>
          <td>Login</td>
          <td>Logout</td>
          <td>Extension</td>
          <td>Expiration</td>
        </tr>
        <tr>
          <td>Received?</td>
          {/* Only set the testId when the value is set so that the test driver waits for React rendering. */}

          {loginSignalReceived ? (
            <td data-testId="loginSignalReceived">Yes</td>
          ) : (
            <td>No</td>
          )}

          {logoutSignalReceived ? (
            <td data-testId="logoutSignalReceived">Yes</td>
          ) : (
            <td>No</td>
          )}

          {extensionSignalReceived ? (
            <td data-testId="extensionSignalReceived">Yes</td>
          ) : (
            <td>No</td>
          )}

          {expirationSignalReceived ? (
            <td data-testId="expirationSignalReceived">Yes</td>
          ) : (
            <td>No</td>
          )}
        </tr>
      </table>
      <AuthenticatedFetch onError={onError} sessionInfo={sessionInfo} />
    </div>
  );
}
