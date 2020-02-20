/**
 * A request credential specific to DPoP Requests
 */
import IRequestCredentials from "../../authenticatedFetch/IRequestCredentials";

export default interface IDPoPRequestCredentials extends IRequestCredentials {
  type: "dpop";
  // TODO: actually fill in key and token
  clientKey: string;
  authToken: string;
}
