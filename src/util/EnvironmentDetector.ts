export type environmentName = "browser" | "server" | "react-native";

export interface IEnvironmentDetector {
  detect(): environmentName;
}

export default class EnvironmentDetector {
  detect(): environmentName {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    if (typeof document != "undefined") {
      return "browser";
    } else if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      typeof navigator != "undefined" &&
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      navigator.product == "ReactNative"
    ) {
      return "react-native";
    } else {
      return "server";
    }
  }
}
