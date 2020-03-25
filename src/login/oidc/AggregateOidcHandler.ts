/**
 * Responsible for selecting the correct OidcHandler to handle the provided OIDC Options
 */
import AggregateHandler from "../../util/handlerPattern/AggregateHandler";
import { injectable, injectAll } from "tsyringe";
import IOidcHandler from "./IOidcHandler";
import IOidcOptions from "./IOidcOptions";
import ISolidSession from "../../solidSession/ISolidSession";

@injectable()
export default class AggregateOidcHandler
  extends AggregateHandler<[IOidcOptions], ISolidSession>
  implements IOidcHandler {
  constructor(@injectAll("oidcHandlers") oidcLoginHandlers: IOidcHandler[]) {
    super(oidcLoginHandlers);
  }
}
