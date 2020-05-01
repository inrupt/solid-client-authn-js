/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * Responsible for decided which Login Handler should be used given the Login Options
 */
import AggregateHandler from "../util/handlerPattern/AggregateHandler";
import { injectable, injectAll } from "tsyringe";
import ILoginHandler from "./ILoginHandler";
import ILoginOptions from "./ILoginOptions";
import ISolidSession from "../solidSession/ISolidSession";

@injectable()
export default class AggregateLoginHandler
  extends AggregateHandler<[ILoginOptions], ISolidSession>
  implements ILoginHandler {
  constructor(@injectAll("loginHandlers") loginHandlers: ILoginHandler[]) {
    super(loginHandlers);
  }
}
