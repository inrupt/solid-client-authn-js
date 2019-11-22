# Legacy Implicit Flow

## Questions
 - Can this be used anywhere other than the web browser?

## Authorization

### 1. Alice Navigates to decentphotos.example

### 2. Alice selects her OP or WebID

### 2.1 Retrieve Profile

If Alice selected her WebID rather than her OP, the profile is retrieved and the issuer is
discovered from the `solid:Issuer` triple.

### 3. Requests OP configuration

### 4. Returns OP configuration

### 5. Requests JWKS

### 6. Returns OP JWKS

### 7. Generates Private/Public key pair

## 8. Saves Private/Public key pair to local storage

### 9. Authorization Request
 - response_type: token
 - scope: openid
 - grant_type: implicit
 - contains public key
 - redirect_url: decentphotos.example
 - webid: DECENTPHOTOS_WEBID

### 10. Retrieves Application WebID
 - This is optional. If an application WebID is not provided, it will assume the user is logging
   in as herself, and the UI for consent will have a HUGE warning.

### 11. Validates redirect_url with WebID

### 12. Gets Alice's consent

### 13. Generates an access_token
 - Includes
    - sub: ALICE_WEBID
    - iss: ALICE_OP
    - aud: DECENT_PHOTOS_WEBID
    - CLIENT_PUBLIC_KEY

### 14. Returns to redirect_uri
  - Has the id_token as well if openid was in the scope

## SENDING REQUEST

### 1. Creates a pop_token
 - Signed by local Private Key
 - Inclues
    - aud: BOB's Pod (RS)

### 2. Request Sent
 - With pop_token and access_token

### 3. Checks pop_token Audience

### 4. Checks client signature

### 5. Retrieves Profile

### 6. Checks Issuer

### 7. Retrieves OP Configuration

### 8. Requests JWKS

### 9. Performs Authentication

### 10. Performs Authorization

### 11. Returns Result