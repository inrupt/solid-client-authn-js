/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import INeededAction from "./INeededAction";

export default interface INeededInactionAction extends INeededAction {
  actionType: "inaction";
}
