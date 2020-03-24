# Solid Auth Fetcher

A client tool to login and make authenticated requests to Solid compliant servers.

## Installation

```bash
npm install solid-auth-fetcher
```

## Examples Usage

 - [On the server](./examples/server)
 - [In the web browser with your own bundler](./examples/bundle)
 - [In the web browser with a script tag](./examples/script)
 - [In React Native (iOS and Andorid)](./examples/react-native)

## Importing

In the browser via the `script` tag:

```html
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
</script>
    solidAuthFetcher.getSession().then((session) => {
        if (!session) {
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
    if (!session) {
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
    if (!session) {
        console.log("User is not logged in")
    } else {
        console.log("User is logged in")
    }
})
```

### For Use in the Web Browser

Let's first see how we can initiate a login.

```typescript
import { login, getSession } from 'solid-auth-fetcher'

// Get User will return a user object, or nothing if no user is logged in.
const session = await getSession()
if (!session) {
  login({
    // You could provide either a "webId" field, or an "oidcIssuer" field if
    // you know who the user's OIDC issuer is. If neither are provided, a
    // pop-up will ask the user to provide one.
    oidcIssuer: 'https://example.com/profile/card#me', 

    // Note that when 'popUp' is false, the browser will redirect the
    // current page thus stopping the current flow (default is false).
    popUp: false,
    
    // The page that that should be queried once login is complete
    redirectUrl: 'https://mysite.com/redirect',
    
    // TEMPORARY: The registered Id for your client.
    clientId: 'coolClient'
  })
}
```

Using `getSession()` to determine if a user is logged in is fine, but it's
generally better to be alerted when a user has logged in. For this, you can
use `onSession()`. Then you can use that user to fetch.

```typescript
import { onSession } from 'solid-auth-fetcher'

onSession((session) => {
  console.log(user.webId)
  session.fetch('https://example.com/resource')
})
```

It is also possible to fetch without the "session" object. Keep in mind that doing so will not make an authenticated fetch if a user is not logged in.

```typescript
import { fetch } from 'solid-auth-fetcher'

fetch('https://example.com/resource', {
  method: 'post',
  body: 'Sweet body, bro'
})
```

There may be some cases where you want to manage multiple users logged in
at once. For this we can use the `uniqueLogin` function.

```typescript
import { uniqueLogin, getSessions } from 'solid-auth-fetcher'

const myWebId = 'https://example.com/profile/card#me'
const sessions = await getSessions()
// If my WebID hasn't been logged in yet.
if (sessions.some((user) => user.webId === myWebId)) {
  await uniqueLogin({
    webId: myWebId,
    redirectUrl: "https://myapp.com/redirect",
    clientId: "coolApp"
  })
}
```

### In the Browser using the Script Tag

### For Use on the Server

Unlike on the browser, servers often need to deal with multiple users, so
the server API has been configured to deal with that by default:

```javascript=
import { uniqueLogin, handleRedirect } from "solid-auth-fetcher";
import express from "express";
import session from "express-session";

const sessions = {};

const app = express();

app.use(
  session({
    secret: "I let Kevin's son beat me in foosball",
    cookie: { secure: false }
  })
);

app.post("/login", async (req, res) => {
    const session = await uniqueLogin({
        oidcIssuer: req.body.webid,
        redirect: "https://myapp.com/redirect",
        clientId: "coolApp"
    });
    req.session.localUserId = session.localUserId;
    sessions[session.localUserId] = session;
    if (
        session.neededAction &&
        session.neededAction.actionType === "redirect"
    ) {
        res.redirect(session.neededAction.redirectUrl);
    }
});

app.get("/redirect", async (req, res) => {
  const session = await handleRedirect(req.url);
  if (session) {
    req.session.localUserId = session.localUserId;
    sessions[session.localUserId] = session;
  }
  res.redirect("/fetch");
});

app.get("/fetch", async (req, res) => {
  if (
    req.session &&
    req.session.localUserId &&
    sessions[req.session.localUserId] &&
    sessions[req.session.localUserId].webId
  ) {
    const result = await sessions[
      req.session.localUserId
    ].fetch("http://example.com/resource", {});
    res.send(result.text())
  }
});

app.listen(3000)

```

### General Usage

#### login(options): Session
Kick off the login process for a global user:

```typescript=
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

    redirect: 'https://mysite.com/redirect',
    clientId: 'coolApp'
}).then((session) => {})
```

Options:
| Field Name | Required?                                          | Type          | Description                                                                                                         | Default   |
|------------|----------------------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------|-----------|
| `webId`    | Yes, unless `issuer` is provided                   | String or URL | The user's WebID                                                                                                    | undefined |
| `issuer`   | Yes, unless `webId` is provided                    | String or URL | The user's issuer                                                                                                   | undefined |
| `redirect` | Yes                                                | String or URL | The URI within this application that the user should be redirected to after successful login. This can be either a web URL or a mobile URL scheme | undefined |
| `clientId` | In the current spec, no, in the upcoming spec, yes | String or URL | The app's WebID                                                                                                     | undefined |
| `popUp`    | No                                                 | Boolean       | If true, the login process will initiate via a popup. This only works on web clients.                               | false     |
| `state`    | No                                                 | String        | The state will be provided with the User's Session object once they have logged in                                  | undefined |
| `clientId`    | Yes (for now)                                                 | String        | The Id of the application registered with the Identity Provider  | undefined |

#### uniqueLogin(options): Session
Kick off the login process for a unique user. This allows you to log in multiple users with solid-auth-fetcher. It's a useful feature for apps that wish to support multiple users being logged into the same client, or for servers that work with multiple clients.

```typescript=
import { uniqueLogin } from 'solid-auth-fetcher';

await uniqueLogin({
    webId: 'https://example.com/profile/card#me',
    popUp: false
    redirect: 'https://mysite.com/redirect'
}).then((session) => {})
```

The options for `uniqueLogin()` are identical to `login()`.

#### fetch(url, options): result
Send an HTTP request to a Solid Pod as the global user:

```typescript=
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
```typescript=
import { logout } from 'solid-auth-fetcher';

logout().then(() => {})
```

#### getSession(): Session
Retrieve the session for the global user:

```typescript=
import { getSession } from 'solid-auth-fetcher';

await getSession().then((session) => {})
```

#### getSessions(): Session[]
Retrieve all sessions currently registered with authFetcher

```typescript=
import { getSessions } from 'solid-auth-fetcher';

await getSessions().then((sessions) => {})
```

#### onSession(callback)
Register a callback function to be called when a new session is received after the user has logged in:

```typescript=
import { onSession } from 'solid-auth-fetcher'

onSession((session) => {
  console.log(session.webId)
})
```

#### onLogout(callback)
Register a callback function to be called when a session is logged out:

```typescript=
import { onLogout } from 'solid-auth-fetcher'

onLogout((session) => {
  console.log(session.webId)
})
```

#### Session
The session object contains information about the logged in user, as well as functions that can be executed as that user (e.g. `logout()`).

```typescript=
interface Session {
  webId?: String, // The user's WebID.
  state?: String, // Any state that was passed upon login.
  neededAction?: {
      actionType: "redirect" | "inaction"
  } // Indicates that you must execute some action to continue.
  logout: () => void // Function to log this user out.
  fetch: (url: string, options: {}): Promise<Result> // Function to fetch as this user
}
```

#### handleRedirect(url): Session
Handle redirects as a part of the OIDC process. This has required usage in servers, but is done automatically on web and mobile.

```typescript=
import { handleRedirect } from 'solid-auth-fetcher'

handleRedirect(window.location.href).then((session) => {})
```


#### customAuthFetcher
Create an instance of `AuthFetcher` with configurable settings:

```typescript=
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

```typescript=
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
