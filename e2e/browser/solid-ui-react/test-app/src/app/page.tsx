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

"use client";

import React, { useState } from "react";
import {
  SessionProvider,
  useSession,
  LoginButton,
} from "@inrupt/solid-ui-react";
import {
  TESTID_OPENID_PROVIDER_INPUT,
  TESTID_LOGIN_BUTTON,
} from "@inrupt/internal-playwright-testids";
// Extension is required for json imports.
// eslint-disable-next-line import/extensions
import PLAYWRIGHT_CONSTANTS from "root/playwright.solid-ui.constants.json";

function Show() {
  const { session } = useSession();
  const [data, setData] = useState<string>();
  const [resourceUrl, setResourceUrl] = useState<string>();

  const handleResource = async () => {
    if (resourceUrl) {
      await session
        .fetch(resourceUrl)
        .then((res) => res.text())
        .then((text) => setData(text));
    }
  };

  return (
    <div>
      {session.info.webId ? (
        <div id="webId">{session.info.webId}</div>
      ) : (
        "Not logged in"
      )}

      <input
        id="resourceInput"
        value={resourceUrl}
        onChange={(e) => {
          setResourceUrl(e.target.value);
        }}
      />
      <button
        role="button"
        onClick={() => handleResource()}
        data-testid="fetchButton"
      >
        Fetch
      </button>
      {data && <div id="data">{data}</div>}
    </div>
  );
}

function Login() {
  const [op, setOp] = useState<string>("https://login.inrupt.com");
  return (
    <div>
      <input
        data-testid={TESTID_OPENID_PROVIDER_INPUT}
        value={op}
        onChange={(e) => {
          setOp(e.target.value);
        }}
      />

      <LoginButton
        oidcIssuer={op}
        redirectUrl={`http://localhost:${PLAYWRIGHT_CONSTANTS.UI_REACT_TEST_PORT}`}
      >
        <button data-testid={TESTID_LOGIN_BUTTON}>Login</button>
      </LoginButton>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <SessionProvider>
        <Login />
        <Show />
      </SessionProvider>
    </main>
  );
}
