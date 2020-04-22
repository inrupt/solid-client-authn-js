/**
 * Responsible for deciding which Login Handler should be used given within the popup
 */
import AggregateHandler from "../../util/handlerPattern/AggregateHandler";
import { injectable, injectAll } from "tsyringe";
import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import ISolidSession from "../../solidSession/ISolidSession";

@injectable()
export default class AggregatePostPopUpLoginHandler
  extends AggregateHandler<[ILoginOptions], ISolidSession>
  implements ILoginHandler {
  constructor(
    @injectAll("postPopUpLoginHandlers") loginHandlers: ILoginHandler[]
  ) {
    super(loginHandlers);
  }
}
