import Environment from "jest-environment-jsdom";
// Requires OPENSSL_CONF=/dev/null (see https://github.com/nodejs/node/discussions/43184?sort=new) 
import { Crypto, CryptoKey } from "@peculiar/webcrypto";

// Custom test environment copied from https://github.com/jsdom/jsdom/issues/2524
// in order to add TextEncoder to jsdom. TextEncoder is expected by jose.

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

    // The following can be moved to jest-jsdom-polyfills.
    // jsdom doesn't implement the Web Crypto API
    // For some reason,  this.global.crypto = new Crypto() leaves .subtle undefined
    (this.global.crypto.subtle as any) = (new Crypto()).subtle;
    this.global.CryptoKey = CryptoKey;
  }
};
