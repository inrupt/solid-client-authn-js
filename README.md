# Solid Auth Fetcher

A client tool to login and make authenticated requests to Solid compliant servers.

For use on the server-side (solid-node-client, solid-crud-tests, web-access-control-tests, etc.), we provide three special functions:
*  `getNodeSolidServerCookie(serverRoot: string, username: string, password: string): Promise<string | null>`
  - POSTs to /login/password to get a cookie
  - NSS-specific
*  `getAuthFetcher(oidcIssuer: string, oidcProviderCookie: string, appOrigin: string): Promise<AuthFetcher>`
  - uses generic webid-oidc login
  - relies on auth to IDP with cookie
  - make sure the user has already authorized `appOrigin` as a trusted app
*  `getAuthHeaders(urlStr: string, method: string, authFetcher): Promise<{ Authorization: string; DPop: string }>`
  - will allow you to send the [WebSockets `auth` and `dpop` headers](https://github.com/solid/specification/issues/52#issuecomment-682491952)
See ./examples/server for an example

## Installation

```bash
npm install solid-auth-fetcher
```

## Examples Usage

 - [In the web browser with your own bundler](./examples/bundle)
 - [In the web browser with a script tag](./examples/script)
 - [On the server](./examples/server)
 - [In React Native (iOS and Andorid)](./examples/react-native)

### Web app

```bash
git clone https://github.com/solid/solid-auth-fetcher.git
cd solid-auth-fetcher
cd examples/bundle
# Edit the TEST_URL in line 10 of index.html to something on your own pod.
npx serve
```
Now browse to http://localhost:5000/

### Node

See for instance how the solid-crud-tests use solid-auth-fetcher to [obtain the auth headers for use in websockets-pubsub](https://github.com/solid/solid-crud-tests/blob/v2.0.3/test/helpers/util.ts)
or to [test an authenticated DELETE request](https://github.com/solid/solid-crud-tests/blob/v2.0.3/test/surface/delete.test.ts#L50-L52).

### Setting up the other examples (YMMV)

```bash
git clone https://github.com/solid/solid-auth-fetcher.git
cd solid-auth-fetcher
npm i
npm run bootstrap-examples
npm run build
# Run each example
npm run dev-bundle
# npm run dev-script - see https://github.com/solid/solid-auth-fetcher/issues/9
# npm run dev-server - see https://github.com/solid/solid-auth-fetcher/issues/8
# npm run dev-ios - untested, see https://github.com/solid/solid-auth-fetcher/issues/10
# npm run dev-android - untested, see https://github.com/solid/solid-auth-fetcher/issues/10
```

At this point, a test application will be running on port `3001` and a test solid server will be running on port `9001`

## Importing

In the browser via the `script` tag:

```html
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
</script>
    solidAuthFetcher.getSession().then((session) => {
        if (!session.loggedIn) {
            console.log("User is not logged in")
        } else {
            console.log("User is logged in")
        }
    })
</script>
```

Using `import`

```javascript
import { getSession } from "solid-auth-fetcher"

getSession().then((session) => {
    if (!session.loggedIn) {
        console.log("User is not logged in")
    } else {
        console.log("User is logged in")
    }
})
```

Using `require`

```javascript
const solidAuthFetcher = require("solid-auth-fetcher")

solidAuthFetcher.getSession().then((session) => {
    if (!session.loggedIn) {
        console.log("User is not logged in")
    } else {
        console.log("User is logged in")
    }
})
```

### For Use in the Web Browser

#### Simple Login

Let's first see how we can initiate a login.

```typescript
import { login, getSession } from 'solid-auth-fetcher'

// getSession will return a session object
getSession().then(async (session) => {
  if (!session) {
    const session = await login({
      // You could provide either a "webId" field, or an "oidcIssuer" field if
      // you know who the user's OIDC issuer is. If neither are provided, a
      // pop-up will ask the user to provide one. If it is running on the server
      // the popup parameter will be ingored.
      oidcIssuer: 'https://identityProvider.com', 

      // Note that when 'popUp' is false, the browser will redirect the
      // current page thus stopping the current flow (default is false).
      popUp: false,
      
      // The page that that should be queried once login is complete
      redirectUrl: 'https://mysite.com/redirect',
    })
    // Chances are that this session will not be logged in. Instead, your browser
    // window will be redirected and you'll be able to get the logged in session
    // via `getSession` or `onSession` after the redirect.
    console.log(session);
  }
})
```

#### Login with a PopUp Window

By default, the user is redirected to the login page within the same window, but you might want to maintain the state of your application without it being interrupted by a redirect. To do so, you can use a popup. If you do want to use a popup, you should provide a `popUpRedirectPath` for the popup window to redirect to. At this path you should run the `handlePopUpRedirect` function

`index.html`:
```html
<html>
<head>
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
<script>
  function login() {
    solidAuthFetcher.login({
      oidcIssuer: "https://identityProvider.com",
      popUp: true,
      popUpRedirectPath: "/popup.html"
    })
  }
</script>
<head>

<body>
  <button onClick="login()">login</button>
</body>
</html>
```

`popup.html`:
```html
<html>
<head>
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
<script>
  solidAuthFetcher.handlePopUpRedirect()
</script>
<head>
</html>
```

#### Getting alerted on a new session

Using `getSession()` to determine if a user is logged in is fine, but it's
generally better to be alerted when a user has logged in. For this, you can
use `onSession()`. Then you can use that user to fetch.

```typescript
import { onSession } from 'solid-auth-fetcher'

onSession((session) => {
  if (session.loggedIn) {
    console.log(user.webId)
    session.fetch('https://example.com/resource')
  }
})
```

#### Fetching without the Session Object

It is also possible to fetch without the "session" object. Keep in mind that doing so will not make an authenticated fetch if a user is not logged in.

```typescript
import { fetch } from 'solid-auth-fetcher'

fetch('https://example.com/resource', {
  method: 'post',
  body: 'What a cool string!'
}).then(async (response) => {
  console.log(await response.text());
})
```
#### Logging in Multiple Users

There may be some cases where you want to manage multiple users logged in
at once. For this we can use the `uniqueLogin` function.

```typescript
import { uniqueLogin, getSessions } from 'solid-auth-fetcher'

const myWebId = 'https://example.com/profile/card#me'
getSessions().then((sessions) => {
  // If my WebID hasn't been logged in yet.
  if (sessions.some((session) => session.webId === myWebId)) {
    await uniqueLogin({
      webId: myWebId,
      redirectUrl: "https://myapp.com/redirect"
    })
  }
})
```

#### Custom Storage

By default, Solid-Auth-Fetcher will use your browser's local storage. But, you may want to use your own implementation. To do so, you can use the `getCustomAuthFetcher` method and provide its own storage.

```javascript
import { getCustomAuthFetcher } from 'solid-auth-fetcher'

getCustomAuthFetcher({
  storage: {
    // Key is a string and a Promise<string> should be returned
    get: (key) => {/* perform get */}
    // Key and value are both strings and a Promise<void> should be returned
    set: (key, value) => {/* perform set */}
    // Key is a string and a Promise<void> should be returned
    delete: (key) => {/* perform delete */}
  }
}).then((authFetcher) => { /* Do something */ })
```


#### Custom Redirect Handling

By default, Solid-Auth-Fetcher redirects automatically upon login, and automatically handles a redirect back to the app when it is initialized. But, you may want to handle redirects manually. To do this you can use the `doNotAutoRedirect` and the `doNotAutoHandleRedirect` flags along with the `handleRedirect` method.

```javascript
import { getCustomAuthFetcher } from 'solid-auth-fetcher'

// Get the custom auth fetcher that will not trigger `handleRedirect` automatically
getCustomAuthFetcher({
  doNotAuthHandleRedirect: true
}).then(async (authFetcher) => {

  // If we are at the redirect location we want to handle it
  if (window.location.pathname === "/redirect") {
    // Call the handleRedirect method with the current url
    await authFetcher.handleRedirect(window.location.href);
    // Once the redirect is handled we can return to the home page
    window.history.replaceState({}, "", window.location.origin)


  // If we are not at the redirect route we should trigger a log in or get
  //  the session
  } else {
    const curSession = await getSession()
    if (curSession.loggedIn) {
      console.log("The user is logged in");
    } else {
      // Log in if the user is not already
      const session = await authFetcher.login({
        oidcIssuer: 'https://identityProvider.com', 
        redirectUrl: 'https://mysite.com/redirect',
        // Notice this flag the suppresses the auto redirect
        doNotAutoRedirect: true
      });

      // Because we have suppressed the redirect, the session will not
      // be logged in, but rather have a "NeededAction" object that will
      // describe where we should redirect
      if (
        session.neededAction &&
        session.neededAction.actionType === "redirect"
      ) {
        // Perform the manual redirect
        window.location.href = session.neededAction.redirectUrl
      }
    }
  }
})
```

### For Use on the Server

See [examples/server/src/server.ts](https://github.com/solid/solid-auth-fetcher/blob/master/examples/server/src/server.ts).

### General Usage

#### login(options): [Session](#session)
Kick off the login process for a global user:

```typescript
import { login } from 'solid-auth-fetcher';


login({
    // You could provide either a "webId" field, or an "issuer"
    // field if you know who the user's OIDC issuer is. If
    // neither are provided, a pop-up will ask the user to
    // provide one.
    webId: 'https://example.com/profile/card#me', 

    // Note that when 'popUp' is false, the browser will
    // redirect the current page thus stopping the current
    // flow (default is false).
    popUp: false,

    redirect: 'https://mysite.com/redirect'
}).then((session) => {
  console.log("Please visit", (session.neededAction as any).redirectUrl);
})
```
It will print something like
```
Please visit https://localhost:8443/authorize?response_type=id_token%20code&redirect_uri=https%3A%2F%2Fmysite.com%2Fredirect&scope=openid%20profile%20offline_access&client_id=636e3fec47416ca31d58d15344ebdfda&code_challenge_method=S256&code_challenge=5J6v7lYziRQ8yqKCsF6JsxvoLHvZjpNMt1iiJSQgdQU&state=global
```


Options:
| Field Name | Required?                                          | Type          | Description                                                                                                         | Default   |
|------------|----------------------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------|-----------|
| `webId`    | Yes, unless `issuer` is provided                   | String or URL | The user's WebID                                                                                                    | undefined |
| `issuer`   | Yes, unless `webId` is provided                    | String or URL | The user's issuer                                                                                                   | undefined |
| `redirect` | Yes                                                | String or URL | The URI within this application that the user should be redirected to after successful login. This can be either a web URL or a mobile URL scheme | undefined |
| `clientId` | In the current spec, no, in the upcoming spec, yes | String or URL | The app's WebID                                                                                                     | undefined |
| `popUp`    | No                                                 | Boolean       | If true, the login process will initiate via a popup. This only works on web clients.                               | false     |
| `popUpRedirectPath`    | No                                                 | String       | The path to which a popup window should redirect after the user is logged in   | undefined     |
| `state`    | No                                                 | String        | The state will be provided with the User's Session object once they have logged in                                  | undefined |
| `doNotAutoRedirect`    | No                                                 | Boolean        | If true, the browser will not auto redirect. Note that auto redirect only happens if Solid-Auth-Fetcher is running in the browser | false |

#### uniqueLogin(options): [Session](#session)
Kick off the login process for a unique user. This allows you to log in multiple users with solid-auth-fetcher. It's a useful feature for apps that wish to support multiple users being logged into the same client, or for servers that work with multiple clients.

```javascript
import { uniqueLogin } from 'solid-auth-fetcher';

uniqueLogin({
    webId: 'https://example.com/profile/card#me',
    popUp: false
    redirect: 'https://mysite.com/redirect'
}).then((session) => {})
```

The options for `uniqueLogin()` are identical to `login()`.

#### fetch(url, options): result
Send an HTTP request to a Solid Pod as the global user:

```typescript
import { fetch } from 'solid-auth-fetcher';

fetch('https://example.com/resource', {
    method: 'POST',
    headers: {
        "Content-Type": "text/plain"
    },
    body: 'Sweet body, bro'
}).then((result) => {})
```
Fetch follows the [WHATWG Fetch Standard](https://github.github.io/fetch/).

#### logout()
Log the global user out:
```typescript
import { logout } from 'solid-auth-fetcher';

logout().then(() => {})
```

#### getSession(): [Session](#session)
Retrieve the session for the global user:

```typescript
import { getSession } from 'solid-auth-fetcher';

await getSession().then((session) => {})
```

#### getSessions(): [Session](#session)[]
Retrieve all sessions currently registered with authFetcher

```typescript
import { getSessions } from 'solid-auth-fetcher';

await getSessions().then((sessions) => {})
```

#### onSession(callback)
Register a callback function to be called when a new session is received after the user has logged in:

```typescript
import { onSession } from 'solid-auth-fetcher'

onSession((session) => {
  console.log(session.webId)
})
```

The callback receives a [`Session`](#session) object as its sole parameter.

#### onLogout(callback)
Register a callback function to be called when a session is logged out:

```typescript
import { onLogout } from 'solid-auth-fetcher'

onLogout((session) => {
  console.log(session.webId)
})
```

#### onRequest(callback)
Register a callback function to be called whenever a request is made:

```typescript
import { onRequest } from 'solid-auth-fetcher'

onRequest((url, requestOptions) => {
  console.log(url)
})
```

#### Session
The session object contains information about the logged in user, as well as functions that can be executed as that user (e.g. `logout()`).

```typescript
interface Session {
  localUserId: String // The id to internally track this session
  loggedIn: Boolean // True if this session is logged in
  webId?: String // The user's WebID.
  state?: String // Any state that was passed upon login.
  neededAction?: {
      actionType: "redirect" | "inaction"
  } // Indicates that you must execute some action to continue.
  logout: () => void // Function to log this user out.
  fetch: (url: string, options: {}): Promise<Result> // Function to fetch as this user
}
```

#### handleRedirect(url): Session
Handle redirects as a part of the OIDC process. Servers using solid-auth-fetcher must manually call this method on redirect, but is done automatically on web and mobile.

```typescript
import { handleRedirect } from 'solid-auth-fetcher'

handleRedirect(window.location.href).then((session) => {})
```


#### customAuthFetcher
Create an instance of `AuthFetcher` with configurable settings:

```typescript
import customAuthFetcher from 'solid-auth-fetcher'

const authFetcher = customAuthFetcher({
    // A custom implementation of how auth fetcher should persist its
    // data.
    storage: { 
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<void>
        delete: (key: string) => Promise<void>
    },
    
    // If true, handleRedirect will automatically be triggered on web
    // and mobile platforms. Default is true. 
    shouldAutoHandleRedirect: boolean 
})
```

#### AuthFetcher
The primary object for logging in, and making authenticated fetches:

```typescript
interface AuthFetcher {
    login: (options: {}) => Promise<void>
    fetch: (url: string | URL, options: {}) => Promise<Response>
    logout: () => Promise<void>
    getSession: () => Promise<Session>
    getSessions: () => Promise<Session[]>
    uniqueLogin: (options: {}) => Promise<void>
    onSession: (callback: (session: Session) => any) => void
    onLogout: (callback: (session: Session) => any) => void
    handleRedirect:  (url: string | URL) => Promise<void>
}
```

### Injecting your custom functionality

Any part of `solid-auth-fetcher` can be modified without the need to 
commit to the source library. All you need to do is build up a dependency injection heirarchy as seen in https://github.com/inrupt/solid-auth-fetcher/blob/refactor/src/dependencies.ts.
