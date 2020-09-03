## Installation

```bash
npm install @inrupt/solid-client-authn-browser
```

## Importing

### Via the `script` tag:

```html
<script src="/path/to/solid-client-authn.bundle.js"></script>
<script>
    const session = new solidClientAuthentication.Session({
        clientAuthentication: solidClientAuthentication.getClientAuthenticationWithDependencies({});
    });
    // ...
</script>
```

### Using `import`

```javascript
import { Session } from "@inrupt/solid-client-authn-browser";

const session = new Session({
    clientAuthentication: getClientAuthenticationWithDependencies({});
});
```

### Using `require`

```javascript
const solidClientAuthentication = require("@inrupt/solid-client-authn-browser");

const session = new solidClientAuthentication.Session({
    clientAuthentication: solidClientAuthentication.getClientAuthenticationWithDependencies({});
});
```

## Single Session API Tutorial

### Login

If solid-client-authn is installed in an application that operates in a web browser, triggering login is a simple process:

```typescript
import {
  Session,
  getClientAuthenticationWithDependencies
} from "@inrupt/solid-client-authn-browser";

// Build a session.
const session = new solidClientAuthentication.Session({
    clientAuthentication: solidClientAuthentication.getClientAuthenticationWithDependencies({})},
    "mySession"
);

// Redirect the user to their OIDC identity provider...
await session.login({
    // The URL of the user's OIDC issuer.
    oidcIssuer: 'https://identityProvider.com', 
    // The url the system should redirect to after login.
    redirectUrl: 'https://mysite.com/redirect',
});

// Complete the login when receiving a request to https://mysite.com/redirect.
// ...
session.handleIncomingRedirect(
    new URL(window.location.href)
);

onLogin((sessionInfo) => {
  // Logs the user's webId
  console.log(sessionInfo.webId);
});
```

### Fetch

You can use the `fetch` function anywhere in your application.
If you've already logged in, the `fetch` function automatically fills in the user's
credentials. If not, it will attempt to make a request without the user's credentials.

```typescript
import { Session } from "@inrupt/solid-client-authn-browser";

const session = new solidClientAuthentication.Session({
    clientAuthentication: solidClientAuthentication.getClientAuthenticationWithDependencies({})},
    "mySession"
);

session.fetch('https://example.com/resource', {
  method: 'post',
  body: 'What a cool string!'
}).then(async (response) => {
  console.log(await response.text());
});
```

### Custom Redirect Handling

In the web browser, by default, solid-client-authn redirects automatically upon login,
and automatically handles a redirect back to the app when it is initialized.
But, you may want to handle redirects manually. To do this you can use the `handleRedirect`
option.

```typescript
import {
  Session,
  getClientAuthenticationWithDependencies
} from "@inrupt/solid-client-authn-browser";

// Build a session.
const session = new solidClientAuthentication.Session({
    clientAuthentication: solidClientAuthentication.getClientAuthenticationWithDependencies({})},
    "mySession"
);

// Redirect the user to their OIDC identity provider...
await session.login({
    // The URL of the user's OIDC issuer
    oidcIssuer: 'https://identityProvider.com', 
    // The url the system should redirect to after login
    redirectUrl: 'https://mysite.com/redirect',
    // Custom redirect handling here:
    handleRedirect: (redirectUrl) => {
        window.location.href = redirectUrl
    }
});
```
