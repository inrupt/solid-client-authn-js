/**
 * Top Level document for authenticator-node
 */
import AuthenticatorCore from "@solid/authenticator-core";
import InMemoryStorage from "./storage/InMemoryStorage";
import NodeJoseUtility from "./NodeJoseUtility";

export default function authenticator() {
  // TODO implement
  return AuthenticatorCore({
    storage: new InMemoryStorage(),
    joseUtility: new NodeJoseUtility()
  });
}

export function authenticatedFetch() {
  // TODO implement
}

export function login(): string {
  // TODO implement
  return "";
}
