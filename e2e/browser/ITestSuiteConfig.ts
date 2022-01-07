import ITestConfig from "./ITestConfig";
import IPodServerConfig from "./IPodServerConfig";

export default interface ITestSuiteConfig {
  podServerList: IPodServerConfig[];
  testList: ITestConfig[];
}
