export default interface IPodServerConfig {
  description: string;
  podResourceServer: string;
  identityProvider: string;
  envTestUserName: string;
  envTestUserPassword: string;
  brokeredIdp: "nss" | "Gluu" | "Google" | "Github" | "Auth0" | "Cognito";
  authorizeClientAppMechanism: "nss" | "ess";
  loginTimeout: number;
  fetchTimeout: number;
}
