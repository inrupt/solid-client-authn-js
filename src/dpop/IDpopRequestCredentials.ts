/**
 * A request credential specific to Dpop Requests
 */
import IRequestCredentials from "../authenticatedFetch/IRequestCredentials";

export default interface IDpopRequestCredentials extends IRequestCredentials {
  type: "dpop";
  // TODO: actually fill in key and token
  clientKey: string;
  authToken: string;
}
