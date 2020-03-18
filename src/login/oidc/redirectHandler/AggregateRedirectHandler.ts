/**
 * Responsible for selecting the correct OidcHandler to handle the provided OIDC Options
 */
import AggregateHandler from "../../../util/handlerPattern/AggregateHandler";
import { injectable, injectAll } from "tsyringe";
import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";

@injectable()
export default class AggregateRedirectHandler
  extends AggregateHandler<[string], ISolidSession>
  implements IRedirectHandler {
  constructor(
    @injectAll("redirectHandlers") redirectHandlers: IRedirectHandler[]
  ) {
    super(redirectHandlers);
  }
}
