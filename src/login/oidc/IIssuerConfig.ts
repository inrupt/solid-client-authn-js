/**
 * Interface to define the configuration that an identity provider can return
 */
import URL from "url-parse";

export default interface IIssuerConfig {
  issuer: URL;
  authorizationEndpoint: URL;
  tokenEndpoint: URL;
  userinfoEndpoint?: URL;
  jwksUri: URL;
  registrationEndpoint?: URL;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  responseModesSupported?: string[];
  grantTypesSupported?: string[];
  acrValuesSupported?: string[];
  subjectTypesSupported: string[];
  idTokenSigningAlgValuesSupported?: string[];
  idTokenEncryptionAlgValuesSupported?: string[];
  idTokenEncryptionEncValuesSupported?: string[];
  userinfoSigningAlgValuesSupported?: string[];
  userinfoEncryptionAlgValuesSupported?: string[];
  userinfoEncryptionEncValuesSupported?: string[];
  requestObjectSigningAlgValuesSupported?: string[];
  requestObjectEncryptionAlgValuesSupported?: string[];
  requestObjectEncryptionEncValuesSupported?: string[];
  tokenEndpointAuthMethodsSupported?: string[];
  tokenEndpointAuthSigningAlgValuesSupported?: string[];
  displayValuesSupported?: string[];
  claimTypesSupported?: string[];
  claimsSupported: string[];
  serviceDocumentation?: string[];
  claimsLocalesSupported?: boolean;
  uiLocalesSupported?: boolean;
  claimsParameterSupported?: boolean;
  requestParameterSupported?: boolean;
  requestUriParameterSupported?: boolean;
  requireRequestUriRegistration?: boolean;
  opPolicyUri?: URL;
  opTosUri?: URL;
}
