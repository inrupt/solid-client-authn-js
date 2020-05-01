/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import IHandleable from "../util/handlerPattern/IHandleable";

type ILogoutHandler = IHandleable<[string], void>;
export default ILogoutHandler;
