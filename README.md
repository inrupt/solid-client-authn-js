# solid-auth-client-rewrite
A client library for authenticating with Solid

## API

```ts
import Auth from 'solid-auth-client'

const auth = Auth({
  preserveCache: boolean
})

// Client credentials login
auth.login(idpURL: string, {
  applicationWebID?: string,
  clientCredentials?: {
    clientId: string
    clientSecret: string
  }
})

// Server side code token flow
auth.
```
