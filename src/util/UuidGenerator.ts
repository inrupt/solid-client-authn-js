/**
 * A wrapper class for uuid
 */
import uuid from "uuid";

export interface IUuidGenerator {
  v4(): string;
}

export default class UuidGenerator {
  v4(): string {
    return uuid.v4();
  }
}
