/**
 * A wrapper class for uuid
 */
import { v4 } from "uuid";

export interface IUuidGenerator {
  v4(): string;
}

export default class UuidGenerator {
  v4(): string {
    return v4();
  }
}
