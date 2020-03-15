import { RequestInfo, RequestInit } from "node-fetch";
import INeededAction from "./INeededAction";

export default interface INeededAjaxAction extends INeededAction {
  actionType: "ajax";
  requestInfo: RequestInfo;
  requestInit: RequestInit;
}
