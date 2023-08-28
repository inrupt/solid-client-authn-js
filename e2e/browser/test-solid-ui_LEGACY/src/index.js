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
import {
  SessionProvider,
  useSession,
  LoginButton,
} from "@inrupt/solid-ui-react";
import ReactDOM from "react-dom/client";

function Show() {
  const { session } = useSession();
  const [data, setData] = useState(false);
  const [resourceUrl, setResourceUrl] = useState(false);

  useEffect(() => {
    if (resourceUrl) {
      setData(false);

      session
        .fetch(resourceUrl)
        .then((res) => res.text())
        .then((text) => setData(text));
    }
  }, [resourceUrl]);

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
      {data && <div id="data">{data}</div>}
    </div>
  );
}

function Login() {
  const [text, setText] = useState();
  return (
    <div>
      <input
        id="issuerInput"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />

      <LoginButton oidcIssuer={text} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <SessionProvider>
      <Login />
      <Show />
    </SessionProvider>
  </React.StrictMode>,
);
