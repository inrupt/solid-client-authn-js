/**
 * A request credential specific to Dpop Requests
 */
import IRequestCredentials from "../authenticatedFetch/IRequestCredentials";

export default interface IDpopRequestCredentials extends IRequestCredentials {
  type: "dpop";
}
