# Solid-Auth-Fetcher

Solid-Auth-Fetcher is a library designed to authenticate with Solid identity servers and make requests to Solid storage servers from JavaScript client deployed in any environment.

## Using the Appropriate API

Solid-Auth-Fetcher includes two APIs for building applications: a "Single Session API" and a "Multi Session API".

### When to use the "Single Session API"

Solid-Auth-Fetcher's "Single Session API" is designed to provide a streamlined experience to implementing authentication in apps that are focused on one user. You'd use the single session api to

 - Create a single page web application that only one user logs into at a time.
 - Make a bot that only represents one user.
 - Build a mobile application that only one user logs into at a time.

#### Examples Usage

 - [Single-session the web browser with your own bundler](./examples/multi/bundle)
 - [Single-session the web browser with a script tag](./examples/multi/script)
 - [Single-session the server](./examples/multi/server)

### When to use "Multi Session API"

Solid-Auth-Fetcher's "Multi Session API" allows you to manage multiple sessions for multiple logged in users. You'd use the multi session api to

 - Create a web application with a server side component. While one user may be logged into each individual client, the server will need to manage all logged in users.
 - Make a bot that needs to handle multiple users.
 - You have a single page application, but you want to maintain credentials on the server for security.
 - You want to log in multiple identities for either a single human user or multiple users.

#### Examples Usage

 - [Multi-session the web browser with your own bundler](./examples/multi/bundle)
 - [Multi-session the web browser with a script tag](./examples/multi/script)
 - [Multi-session the server](./examples/multi/server)

### Setting up the examples

```bash
git clone https://github.com/inrupt/solid-auth-fetcher.git
cd Solid-Auth-Fetcher
npm i
npm run bootstrap-examples
# Run each example
npm run dev-single-bundle
npm run dev-single-script
npm run dev-signle-server
npm run dev-multi-bundle
npm run dev-multi-script
npm run dev-multi-server
```

At this point, a test application will be running on port `3001` and a test solid server will be running on port `9001`

Be sure that you type in a valid solid issuer before logging in.

## Installation

```bash
npm install @inrupt/solid-auth-fetcher
```

## Importing

In the browser via the `script` tag:

```html
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
</script>
    solidAuthFetcher.getSessionInfo()
      .then((sessionInfo) => console.log(sessionInfo))
</script>
```

Using `import`

```javascript
import { getSession } from "@inrupt/solid-auth-fetcher"

getSessionInfo()
  .then((sessionInfo) => console.log(sessionInfo))
```

Using `require`

```javascript
const solidAuthFetcher = require("@inrupt/solid-auth-fetcher")

solidAuthFetcher.getSessionInfo()
  .then((sessionInfo) => console.log(sessionInfo))
```

## Single Session API Tutorial

### Login
If Solid-Auth-Fetcher is installed on an application that operates in the web browser, triggering login is a simple process:

```typescript
import {
  login,
  getSession,
  onLogin
} from '@inrupt/solid-auth-fetcher'

getSession().then(async (session) => {
  // Check if the user is already logged in
  if (!session.loggedIn) {
    await login({
      // The URL of the user's OIDC issuer
      oidcIssuer: 'https://identityProvider.com', 
      // The url the system should redirect to after login
      redirectUrl: 'https://mysite.com/redirect',
      // Optional in the web browser, this signifies any needed redirects are handled automatically
      handleRedirect: 'auto'
    });
  }
});

onLogin((sessionInfo) => {
  // Logs the user's webId
  console.log(sessionInfo.webId);
});
```

### Fetch
You can use the `fetch` function anywhere in your application. If you've already logged in, the `fetch` function automatically fills in the user's credentials, if not, it will attempt to make a request without the user's credentials.

```typescript
import { fetch } from '@inrupt/solid-auth-fetcher'

fetch('https://example.com/resource', {
  method: 'post',
  body: 'What a cool string!'
}).then(async (response) => {
  console.log(await response.text());
})
```

### Login with a PopUp Window
By default, the user is redirected to the login page within the same window, but you might want to maintain the state of your application without it being interrupted by a redirect. To do so, you can use a popup.

`index.html`
```html
<html>
<head>
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
<script>
  function login() {
    solidAuthFetcher.login({
      oidcIssuer: "https://identityProvider.com",
      popUp: true,
      redirectUrl: "https://mysite.com/popup.html"
    })
  }
</script>
<head>

<body>
  <button onClick="login()">login</button>
</body>
</html>
```

Be sure to call the `handleIncomingRedirect` function on the redirect route.

`popup.html`
```html
<html>
<head>
<script src="/path/to/solidAuthFetcher.bundle.js"></script>
<script>
  solidAuthFetcher.handleIncomingRedirect()
</script>
<head>
</html>
```

### Logging in outside the browser
If you want to use the simple API to log in anywhere other than a web-browser, you must call `handleRedirect` at the redirect route.

```typescript
import express from 'express'
import {
  login,
  fetch,
  handleIncomingRedirect
} from "@inrupt/solid-auth-fetcher"

const app = express()
app.get('/login', async (req, res) => {
  // Begin login process.
  await login({
    oidcIssuer: 'https://identityProvider.com',
    redirectUrl: 'https://mysite.com/redirect',
    // handleRedirect must be implemented outside of the
    // browser. Implement a redirect here.
    handleRedirect: (redirectUrl) => {
      res.redirect(redirectUrl)
    }
  })
})

app.get('/redirect', async (req, res) => {
  // Provide the adapter here
  await handleIncomingRedirect(req.url)
})

app.get('/fetch', async (req, res) => {
  const result = await fetch("https://example.com/resource")
  res.send(await result.text())
})
```

### Custom Redirect Handling
In the web browser, by default, Solid-Auth-Fetcher redirects automatically upon login, and automatically handles a redirect back to the app when it is initialized. But, you may want to handle redirects manually. To do this you can use the `handleRedirect` option.

```typescript
import {
  login,
  getSessionInfo,
  onLogin
} from 'solid-auth-fetcher'

async function init() {
  await onLogin((sessionInfo) => {
    console.log(sessionInfo.webId);
  });
}

async function login() {
  const sessionInfo = await getSessionInfo()
  if (!sessionInfo.loggedIn) {
    await login({
      oidcIssuer: 'https://identityProvider.com',
      redirectUrl: 'https://mysite.com/redirect',
      // Custom redirect handling here:
      handleRedirect: (redirectUrl) => {
        window.location.href = redirectUrl
      }
    });
  }
}

init().then(login)
```

## Single Session API

### login(options) => Promise:void
Kick off the login process for the user:

```typescript
import { login } from '@inrupt/solid-auth-fetcher';

login({
    oidcIssuer: 'https://identityprovider.com', 
    redirectUrl: 'https://mysite.com/redirect'
}).then((neededAction) => {})
```

Options:
| Field Name | Required?                                          | Type          | Description                                                                                                         | Default   |
|------------|----------------------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------|-----------|
| `oidcIssuer`   | Yes | String or URL | The user's issuer                                                                                                   | undefined |
| `redirectUrl` | Yes                                                | String or URL | The URI within this application that the user should be redirected to after successful login. This can be either a web URL or a mobile URL scheme | undefined |
| `clientId` | Only if you don't want to do [dynamic registration](https://tools.ietf.org/html/rfc7591) | String or URL | The id of a statically registered application.                                                                                                     | undefined |
| `clientSecret` | Only if you don't want to do [dynamic registration](https://tools.ietf.org/html/rfc7591) | String or URL | The secret of a statically registered application. __Warning__: do not use this in a web browser environment.                                                                                                     | undefined |
| `popUp`    | No                                                 | Boolean       | If true, the login process will initiate via a popup. This only works on web clients.                              | false     |
| `handleRedirect`    | No                                                 | `(redirectUrl) => {}` or `"auto"`        | If a function is provided, the browser will not auto redirect and will instead trigger that function to redirect. If "auto" or undefined, the browser will auto redirect given it is in a browser environment. | "auto" |

### fetch(url, options) => Promise:result

Send an HTTP request to a Solid Pod:

```typescript
import { fetch } from '@inrupt/solid-auth-fetcher';

fetch('https://example.com/resource', {
    method: 'POST',
    headers: {
        "Content-Type": "text/plain"
    },
    body: 'What a cool body!'
}).then((result) => {})
```
Fetch follows the [WHATWG Fetch Standard](https://github.github.io/fetch/).

### logout() => Promise:void
Log the user out:
```typescript
import { logout } from '@inrupt/solid-auth-fetcher';

logout().then(() => {})
```

### getSession() => Promise:[Session](#session)
Retrieve the user's session:

```typescript
import { getSession } from '@inrupt/solid-auth-fetcher';

await getSession().then((session) => {
  console.log(session.isLoggedIn)
  console.log(session.webId)
})
```

### onLogin(callback) => Promise:void
Register a callback function to be called when a user completes login:

```typescript
import { onLogin } from '@inrupt/solid-auth-fetcher'

onLogin((sessionInfo) => {
  console.log(session.webId)
})
```

### onLogout(callback) => Promise:void
Register a callback function to be called when a user logs out:

```typescript
import { onLogout } from '@inrupt/solid-auth-fetcher'

onLogout(() => {})
```

### handleIncomingRedirect(url) => Promise:void
Handles redirects as a part of the login process. Servers using Solid-Auth-Fetcher must manually call this method on redirect, but is done automatically on web and mobile.

```typescript
import { handleIncomingRedirect } from '@inrupt/solid-auth-fetcher'

handleRedirect(window.location.href)
```

### handlePopUpRedirect(url) => Promise:void
Handles redirects from the popup login process. This function should be triggered on the redirectUrl that was provided as a login option.

```typescript
import { adapters } from '@inrupt/solid-auth-fetcher'

handlePopUpRedirect(window.location.href)
```

## Multi Session API Tutorial

Many applications have a centralized server-side component. This means that all requests for every user will be routed through the server. We want tools to manage multiple users in an ecosystem. That's where the multi session API comes in.

### Understanding Session

A Solid-Auth-Fetcher Session represents the state of a user's connection. Sessions start as logged out, but you can use them to log in, log out, fetch as a user, or listen for events. Each session has a unique Id.

### Creating a Session

Before we create a session, we need to create a SessionManager. The SessionManager will manage all sessions that exist in your application. To create a session call `getSession` on the SessionManager.

```typescript
import { SessionManager } from "@inrupt/solid-auth-fetcher"

const sessionManager = new SessionManager()
sessionManager.getSession().then((session) => {
  console.log(session.sessionId) // <- 04917596-ac8c-42c3-9011-eed09416e1ed
  console.log(session.isLoggedIn) // <- false
})
```

You can also name sessions by passing a name as the first parameter.

```typescript
sessionManager.getSession("myCoolSession").then((session) => {
  console.log(session.sessionId) // <- myCoolSession
})
```

Naming is useful if you have many sessions in your application that you want to keep track of.

### Getting a Session that already exists

Sometimes your execution environment is cleared. Your server could reboot or the user could refresh their webpage. But, sessions conceptually live on! You can retrieve a session after your execution environment is cleared by using the `getSession` method.

```typescript
sessionManager.getSession("myCoolSession").then((session) => {
  if (session) {
    console.log(session.sessionId) // <- myCoolSession
  }
})
```

You may also want to retrieve every session. For this, you can use `getSessions`

```typescript
sessionManager.getSessions().then((sessions) => {
  sessions.forEach((session) => {
    console.log(session.sessionId)
  });
})
```

### Logging in on a Session

Once you have a session, you can trigger a login event.

```typescript
app.get("/login", (req, res) => {
  session.login({
    redirectUrl: "https://mysite.com/redirect",
    oidcIssuer: "https://idp.com",
    handleRedirect: (url) => {
      res.redirect(url)
    }
  }).then(() => {})
})
```

When you call the login function, a few things happen.
 - Solid-Auth-Fetcher negotiates with the server you provided at `oidc-issuer` to see how a user should log in.
 - it generates a link to a special webpage that the user will use to log in (for example `https://idp.com/authorize`)
 - It will pass that link to the `handleRedirect` you provided. This is your opportunity to redirect the user to the provided link. If your code is running in a web-browser, you can do that automatically by setting `handleRedirect: "auto"`.
 - Once the user has logged in, a request will be sent to the route you provided at `redirectUrl` including the user's credentials.

### Handling an incoming redirect

If you are building an application that runs in a web browser, the incoming redirect will be automatically handled. But, on a server or any environment outside of the web browser, you must handle the redirect manually:

```typescript
app.get("/redirect", async (req, res) => {
  await sessionManager.handleIncomingRedirect(req.url)
  res.send()
})
```

### Listening for Events

You can set event listeners to be triggered when a user logs in and logs out.

You can set a listener on the sessionManager itself, which will trigger whenever any session logs in or logs out.
```typescript
sessionManager.onSessionLogin((session) => {
  console.log(`Session ${session.sessionId} logged in.`)
})
sessionManager.onSessionLogout((session) => {
  console.log(`Session ${session.sessionId} logged out.`)
})

// You can also use events
sessionManager.on("sessionLogin", (session) => {
  console.log(`Session ${session.sessionId} logged in.`)
})
sessionManager.on("sessionLogout", (session) => {
  console.log(`Session ${session.sessionId} logged out.`)
})
```

You can also set a listener on the session itself which will only trigger when that specific session has logged in.

```typescript
sessionManager.onLogin(() => {
  console.log(`Session ${session.sessionId} logged in.`)
})
sessionManager.onLogout(() => {
  console.log(`Session ${session.sessionId} logged out.`)
})

// You can also use events
sessionManager.on("login", () => {
  console.log(`Session ${session.sessionId} logged in.`)
})
sessionManager.on("logout", () => {
  console.log(`Session ${session.sessionId} logged out.`)
})
```

__Warning__: Recall that if you are operating in the web-browser and the webpage redirects, your listeners will be lost. Be sure to set your listeners whenever your application loads.

### Fetching

You can use the `fetch` method to make requests as a specific session.

```typescript
session.fetch('https://example.com/resource', {
    method: 'POST',
    headers: {
        "Content-Type": "text/plain"
    },
    body: 'What a cool body!'
}).then((result) => {})
```

### Custom Storage

In many cases, you'll want to configure custom storage. If you're operating outside the browser, you might want to persist values in a database so that you can maintain logged in sessions even when the server reboots.

You can start by building a storage adapter. Storage adapters are simple objects that follow this interface:

```typescript
{
  // Get the a value from storage at a given key
  get(key: string): Promise<string>;
  // Set a value at a key
  set(key: string, value: string): Promise<void>;
  // Remove a value at a key
  delete(key: string): Promise<boolean>;
  // Get all keys in storage
  getEntries(): Promise<Record<string, string>>
}
```

There are two kinds of storage you can provide: A "secure storage" and an "insecure storage". Consider the kind of storage you're using before setting up your configuration.

Secure storage environments are isolated to just you as the developer. It wouldn't be possible for any third party to read it. An example of secure storage is a database that only you have access to.

Insecure storage environments may be accessible to third parties but still work to persist data. An eample of insecure storage is the web browser's session storage.

You do not need to provide both a secure storage and an insecure storage. Provide the storage option that works best for your configuration.

```typescript
const sessionManager = new SessionManager({
  secureStorage: {
    get: (key) => { /* perform get */ },
    set: (key, value) => { /* perform get */ },
    delete: (key) => { /* perform delete. Return true if the item was present */ },
    getEntries: () => { /* Return a map of all keys and values */ },
  }
})
```

## Multi Session API

### class SessionManager
A class that manages all sessions in your application.

#### constructor(options)
Creates a SessionManager object.

```typescript
import { SessionManager } from "@inrupt/solid-auth-fetcher";
import customStorage from "./myCustomStorage"

const sessionManager = new SessionManager({
  secureStorage: customStorage
})
```

Options:
| Field Name | Required? | Type     | Description                                              | Default           |
|------------|-----------|----------|----------------------------------------------------------|-------------------|
| `secureStorage`  | No        | [IStorage](IStorage) | A storage object to help you access your custom storage. A secure storage environment should not be accessible by a third party  | In Memory Storage |
| `insecureStorage`  | No        | [IStorage](IStorage) | A storage object to help you access your custom storage. An insecure storage environment could be accessible by a third party  | In Memory Storage |
| `clientId`  | No        | string | The client id of the application if it was statically registered | undefined |
| `clientSecret`  | No        | string | The client secret of the application if it was statically registered  | undefined |

#### getSessions() =>  Promise:[Session](#class-session)[]
Returns all sessions currently in the session manager.

```typescript
sessionManager.getSessions().then(sessions => {})
```

#### getSession(sessionId?) => Promise:[Session](#class-session)
Creates a new session and adds it to the session manager. If a session id is not provided, a random UUID will be assigned as the session id. If the session of the provided id already exists, that session will be returned.

```typescript
sessionManager.getSession("mySessionid").then((session) => {})
```

#### hasSession(sessionId) => Promise:[Session](#class-session) | null
Returns true if the session has already been created.

```typescript
sessionManager.hasSession("mySessionId").then(doesSessionExist => {})
```

#### onSessionLogin(callback) => void or on("sessionLogin", callback) => void
Registers a callback to be called when a session is logged in.

```typescript
sessionManager.onSessionLogin((session) => {})
sessionManager.on("sessionLogin", (session) => {})
```

#### onSessionLogout(callback) => void or on("sessionLogout" callback)
Registers a callback to be called when a session is logged out.

```typescript
sessionManager.onSessionLogout((session) => {})
sessionManager.on("sessionLogout", (session) => {})
```

#### handleInboundRedirect(url) => void
Part of the login flow is a redirect. If Solid-Auth-Fetcher is deployed in the web-browser, this redirect is handled automatically, but on the server, it must be handled manually. Use the `handleInboundRedirect` at the redirect route for your app.

```typescript
app.get("/redirect", async (req, res) => {
  await sessionManager.handleInboundRedirect(req.url)
  res.redirect("/home");
})
```

### class Session

#### Properties
 - sessionId: string - an identifier for the session
 - webId: string - the WebId of the current user
 - isLoggedIn: boolean - true if the user is logged in

#### constructor(sessionManager, sessionId?)
Creates a Session object. If sessionId is not present, a random UUID will be generated.

**Warning**: you should either use sessionManager.getSession() or call session.init() directly after calling the constructor.

```typescript
import { Session } from "@inrupt/solid-auth-fetcher-sessions"

const session = new Session(sessionManager, "mySessionId")
session.init().then(() => {})
```

#### init() => Promise:void
Initializes the session by saving it to storage if a session with the given id does not already exist, or by syncing it with the session in storage if it already exists.

```typescript
session.init().then(() => {})
```

#### login(options): => Promise:[NeededAction](#neededaction)
Kick off the login process for this session:

```typescript
session.login({
    oidcIssuer: 'https://identityprovider.com', 
    redirectUrl: 'https://mysite.com/redirect'
}).then((neededAction) => {})
```

Options:
| Field Name | Required?                                          | Type          | Description                                                                                                         | Default   |
|------------|----------------------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------|-----------|
| `oidcIssuer`   | Yes | String or URL | The user's issuer                                                                                                   | undefined |
| `redirectUrl` | Yes                                                | String or URL | The URI within this application that the user should be redirected to after successful login. This can be either a web URL or a mobile URL scheme | undefined |
| `clientId` | Only if you don't want to do [dynamic registration](https://tools.ietf.org/html/rfc7591) | String or URL | The id of a statically registered application.                                                                                                     | undefined |
| `clientSecret` | Only if you don't want to do [dynamic registration](https://tools.ietf.org/html/rfc7591) | String or URL | The secret of a statically registered application. __Warning__: do not use this in a web browser environment.                                                                                                     | undefined |
| `popUp`    | No                                                 | Boolean       | If true, the login process will initiate via a popup. This only works on web clients.                              | false     |
| `handleRedirect`    | Yes                                                 | `(redirectUrl) => {}` or `"auto"`        | If a function is provided, the browser will not auto redirect and will instead trigger that function to redirect. If "auto", the browser will auto redirect given it is in a browser environment. | undefined |

#### fetch(url, requestInit) => Promise:response
Send an HTTP request to a Solid Pod:

```typescript
session.fetch('https://example.com/resource', {
    method: 'POST',
    headers: {
        "Content-Type": "text/plain"
    },
    body: 'What a cool body!'
}).then((result) => {})
```
Fetch follows the [WHATWG Fetch Standard](https://github.github.io/fetch/).

#### logout() => Promise:void
Log the user out:
```typescript
session.logout().then(() => {})
```

#### onLogin(callback) => void or on("login", callback) => void
Registers a callback to be called when this session is logged in.

```typescript
sessionManager.onLogin((session) => {})
sessionManager.on("login", (session) => {})
```

#### onLogout(callback) => void or on("logout" callback)
Registers a callback to be called when this session is logged out.

```typescript
sessionManager.onLogout((session) => {})
sessionManager.on("logout", (session) => {})
```

#### IStorage
If you'd like to configure custom storage, provide an object following this interface:
```typescript
{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  getEntries: () => Promise<Record<string, string>>;
}
```