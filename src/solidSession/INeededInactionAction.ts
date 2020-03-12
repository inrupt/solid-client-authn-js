import INeededAction from "./INeededAction";

export default interface INeededInactionAction extends INeededAction {
  actionType: "inaction";
}
