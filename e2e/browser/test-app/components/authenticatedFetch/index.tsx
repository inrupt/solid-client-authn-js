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

import { useState } from "react";
import {
  fetch as authenticatedFetch,
  ISessionInfo,
} from "@inrupt/solid-client-authn-browser";

export default function AuthenticatedFetch({
  onError,
  sessionInfo,
}: {
  sessionInfo?: ISessionInfo;
  onError: (err: string) => void;
}) {
  const [resource, setResource] = useState<string>();
  const [data, setData] = useState<string>("not fetched");

  const handleFetch = () => {
    if (resource !== undefined) {
      authenticatedFetch(resource)
        .then((response) => response.text())
        .then(setData)
        .catch((error) => {
          onError(`Something went wrong during fetch: ${error.toString()}`);
        });
    }
  };

  return (
    <>
      <div>
        <p>
          Session expires at{" "}
          <span data-testid="sessionExpiration">
            {sessionInfo?.expirationDate}
          </span>
        </p>
        <input
          data-testid="fetchUriTextbox"
          type="text"
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
          }}
        />
        <button
          onClick={() => handleFetch()}
          data-testId="fetchButton"
          type="button"
        >
          Fetch
        </button>
      </div>
      <pre data-testid="fetchResponseTextbox">{data}</pre>
    </>
  );
}
