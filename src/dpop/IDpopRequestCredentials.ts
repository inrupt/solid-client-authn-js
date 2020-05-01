/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * A request credential specific to Dpop Requests
 */
import IRequestCredentials from "../authenticatedFetch/IRequestCredentials";

export default interface IDpopRequestCredentials extends IRequestCredentials {
  type: "dpop";
}
