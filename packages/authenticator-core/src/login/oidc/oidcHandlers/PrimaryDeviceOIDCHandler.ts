/**
 * Handler for the Device Flow on the Primary Device
 */
import IOIDCHandler from "../IOIDCHandler";
import IOIDCOptions from "../IOIDCOptions";
import NotImplementedError from "../../../util/errors/NotImplementedError";

export default class PrimaryDeviceOIDCHandler implements IOIDCHandler {
  async canHandle(oidcLoginOptions: IOIDCOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOIDCOptions): Promise<void> {
    throw new NotImplementedError("PrimaryDeviceOIDCHandler handle");
  }
}
