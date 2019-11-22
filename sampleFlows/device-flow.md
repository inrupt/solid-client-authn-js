# Device Flow

## Questions
 - Also keep in mind I wrote this one without an internet connection, so I'm more guessing how this works without reading documentation. Darn GoGo wifi for changing their pricing policy!
 - Are you even able to use JavaScript on constrained devices?
 - I think you could do both access-code (if you have a server side component for the constrained device) and access-code with PKCE (if your constrained defice is just itself), is that correct?
   - Though since you already need a server component to do the login, it might be a good idea just to keep it to the regular authorization code flow
   - If you do use a server, what prevents a rogue constrained device from pretending to be a main device? You can't rely on redirect can you? Do these constrained devices have redirects?
