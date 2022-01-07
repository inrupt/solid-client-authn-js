export default interface ITestConfig {
  name: string;
  performLogin: boolean;
  resourceToGet: string;
  expectResponseContainsAnyOf: string[];
  refresh: boolean | undefined;
}
