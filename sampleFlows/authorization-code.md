# Authorization Code Flow

## Questions
 - Does having a private/public key pair substitute a client secret?
    - If it does, what if we want to log in without an app identity? Should logging in without an app identity even be a thing (It would default to just being the user making a request)?
 - Why would anyone want dynamic registration again given we require apps to have webids?
 - Do we want to have the resource server buy in to the token issuance? We could require the RP to send information on itself (either redirect url or proof of private key posession). Note: if a redirect url is sent, all this redirecting might be inconvenient to the user, though it could be done in a very small IFrame
