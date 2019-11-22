# API for solid-auth-client

Note: it would be a good idea to make this API inspired by Auth0's API, so I should look up the Auth0 API once I land and can connect to the internet.

## Packages:

The following packages might be what Solid Auth Client can be split into

Frontward facing packages:
 - react-native-solid-auth-client
    - Authorization Code with PKCE
    - Legacy Implicit Flow
    - Self-signed
    - Maybe can do device if it's true you can write react native apps for constrained devices?
 - browser-solid-auth-client
    - Legacy Implicit flow
    - auth code with PKCE
    - Self-signed
    - auth code
    - Maybe device if you can put webpages on constrained devices
 - server-solid-auth-client
    - Acts as a companion for a browser client for:
       - authorization code
       - maybe self signed if that's possible
    - May act as a companion for constrained devices if:
       - Constained devices works this way
       - We don't want to split this into a different library
    - May handle client credentials if we don't want to split that into its own module
       - client credentials if the developer gave them a client secret
 - solid-self-signed-bot-auth-client
    - Makes allows you to submit your own private key to correspond with a bot's webid
 - device-solid-auth-client
    - Handles constrained device flow if there is anything that is not browser or react native that uses it.

Core Packages:
 - ???


Additionally there could be an effort to make a self signed app for each platform