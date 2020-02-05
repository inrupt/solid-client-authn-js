# Solid Authenticator

This is a monorepo that contains projects related to solid authenticator:

 - @solid/authenticator: A nodejs implementation of Solid Authenticator
 - @solid/authenticator-core: The core libraries used by various implementations of Solid Authenticator
 - @solid/authenticator-react-native: Solid Authenticator for react native
 - @solid/authenticator-spa: Solid Authenticator for single page applications

## Examples

### For Use in the Web Browser

Let's first see how we can initiate a login.

```typescript
import { login, getUser } from 'solid-authenticator'

// Get User will return a user object or nothing if no user is logged in
const user = await getUser()
if (!user) {
  await login({
    webId: 'https://example.com/profile/card#me', // You could either provide a "webId" field or an "issuer" field if you know what your user's OIDC issuer is. If none are provided, a pop-up will ask the user to provide one.
    popUp: false // Note that when popup is false, the browser will redirect the current page thus topping the flow of this (default is false)
    redirect: 'https://mysite.com/redirect'
  })
}
```

Using `getUser` to determine if a user is logged in is fine, but it's always better to be alerted once a user has logged in. For this, you can use `onUser`. Then you can use that user to fetch.

```typescript
import { onUser } from 'solid-authenticator'

onUser((user) => {
  console.log(user.webId)
  user.fetch('https://example.com/resource')
})
```

It is also possible to fetch without the "user" object. Keep in mind that doing so will not make an authenticated fetch if a user is not logged in.

```typescript
import { fetch } from 'solid-authenticator'

fetch('https://example.com/resource', {
  method: 'post',
  body: 'Sweet body, bro'
})
```

There may be some cases where you want to manage multiple users logged in at once. For this we can use the `loginUniqueUser` function.

```typescript
import { login, getUsers } from 'solid-authenticator'

const myWebId = 'https://example.com/profile/card#me'
const users = await getUsers()
if (users.some((user) => user.webId === myWebId)) { // If my webId hasn't been logged in yet
  await login({
    webId: myWebId,
    unique: true // Unique should be set to true for this special use case. Keep in mind that users logged in using the "unique" field can only use the fetch function in their own User object and cannot use the global "fetch" function
  })
}
```

### For Use on the Server

Unlike on the browser, servers often need to deal with multiple users, so the server API has been configured to deal with that by default:

```typescript
import express from 'express'
import session from 'express-session'
import {
  login,
  userFromRedirectUrl
} from 'solid-authenticator'

const app = expess()

app.use(session({
  secret: 'I let Kevin\'s son beat me in foosball',
  cookie: { secure: true }
}))

app.post('/login', (req, res) => {
  if (req.session.user) {
    res.status(400).send('already logged in')
  }
  const redirectLocation = await login({ 
    webId: req.query.webid, // This assumes your front-end has passed the webId into the url query
    redirectUri: 'https://mysite:3000/redirect'
  })
  res.redirect(redirectLocation)
})

app.get('/redirect', async (req, res) => {
  req.session.user = await userFromRedirectUrl(req.query)
})

app.get('/solidresource', async (req, res) => {
  if (req.session.user) {
    const response = await req.session.user.fetch('https://example.com/resource')
    res.send(response.body)
  } else {
    res.status(401).send()
  }
})

app.listen(3000)
```
