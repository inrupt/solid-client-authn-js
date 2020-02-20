/**
 * Handler for the Device Flow on the Secondary Device
 */
import IOIDCHandler from "../IOIDCHandler";
import IOIDCOptions from "../IOIDCOptions";
import NotImplementedError from "../../../util/errors/NotImplementedError";

export default class SecondaryDeviceOIDCHandler implements IOIDCHandler {
  async canHandle(oidcLoginOptions: IOIDCOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOIDCOptions): Promise<void> {
    throw new NotImplementedError("SecondaryDeviceOIDCHandler handle");
  }
}
