import INeededAction from "./INeededAction";

export default interface INeededRedirectAction extends INeededAction {
  actionType: "redirect";
  redirectUrl: string;
}
