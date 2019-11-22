# Self Signed Flow

## Questions
 - Is it a good idea to create a standardized protocol to register for each device so that we can tell if 
 - Should we use self-issued.me, or something custom for the special Solid use case?
 - We don't need the whole flow with the OP app if this is a bot that controls its own identity right? It can just sign its own tokens in that case.
 - Do you need to send get OP configurations and JWKS in this flow? If so, do the JWKS just match the cert in the WebID?
  - We would still use PKCE tokens here right?
  - How would this be possible if the app is a web app with a server side component. Would it send a redirect to a redirect protocol for the OP app during the consent phase?