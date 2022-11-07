import Environment from "jest-environment-jsdom";

export default class CustomTestEnvironment extends Environment {
  async setup() {
    await super.setup();
    if (typeof this.global.TextEncoder === "undefined") {
      // The following doesn't work from jest-jsdom-polyfills.
      // TextEncoder (global or via 'util') references a Uint8Array constructor
      // different than the global one used by users in tests. This makes sure the
      // same constructor is referenced by both.
      this.global.Uint8Array = Uint8Array;
    }
  }
};
