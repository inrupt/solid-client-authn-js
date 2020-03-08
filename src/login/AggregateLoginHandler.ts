/**
 * Responsible for decided which Login Handler should be used given the Login Options
 */
import AggregateHandler from "../util/handlerPattern/AggregateHandler";
import { injectable, injectAll } from "tsyringe";
import ILoginHandler from "./ILoginHandler";
import ILoginOptions from "./ILoginOptions";

@injectable()
export default class AggregateLoginHandler
  extends AggregateHandler<[ILoginOptions], string>
  implements ILoginHandler {
  constructor(@injectAll("loginHandlers") loginHandlers: ILoginHandler[]) {
    super(loginHandlers);
  }
}
