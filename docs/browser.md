## Installation

```bash
npm install @inrupt/solid-client-authn-browser
```

## Importing

### Via the `script` tag:

```html
<script src="/path/to/solid-client-authn.bundle.js"></script>
</script>
    solidClientAuthn.getSessionInfo()
      .then((sessionInfo) => console.log(sessionInfo))
</script>
```

### Using `import`

```javascript
import { getSession } from "@inrupt/solid-client-authn-browser"

getSessionInfo()
  .then((sessionInfo) => console.log(sessionInfo))
```

### Using `require`

```javascript
const solidClientAuthn = require("@inrupt/solid-client-authn-browser")

solidClientAuthn.getSessionInfo()
  .then((sessionInfo) => console.log(sessionInfo))
```

## Single Session API Tutorial

### Login
If solid-client-authn is installed on an application that operates in the web browser, triggering login is a simple process:

```typescript
import {
  login,
  getSession,
  onLogin
} from '@inrupt/solid-client-authn-browser'

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
import { fetch } from '@inrupt/solid-client-authn-browser'

fetch('https://example.com/resource', {
  method: 'post',
  body: 'What a cool string!'
}).then(async (response) => {
  console.log(await response.text());
})
```

### Custom Redirect Handling
In the web browser, by default, solid-client-authn redirects automatically upon login, and automatically handles a redirect back to the app when it is initialized. But, you may want to handle redirects manually. To do this you can use the `handleRedirect` option.

```typescript
import {
  login,
  getSessionInfo,
  onLogin
} from '@inrupt/solid-client-authn-browser'

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