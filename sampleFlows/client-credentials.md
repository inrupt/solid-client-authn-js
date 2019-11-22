# Client Credentials Flow

## Questions
 - Why is client_credentials not listed in the documentation outline. Is it because it's an OAuth Grant and not an OIDC Flow? How should we structure that in the documentation?
 - Alternatively, could we remove the need for a client secret like I do in the authorization code example. Should it be possible to do both. They have different use cases
    - Client Secret can be used for servers without a webid that want to directly be the person logging in
    - 
 - Consider a way to do this where the bot hosts the auth server internally. Self signed