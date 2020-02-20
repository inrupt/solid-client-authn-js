/**
 * A wrapper class for uuid
 */
import uuid from "uuid";

export interface IUUIDGenerator {
  v4(): string;
}

export default class UUIDGenerator {
  v4(): string {
    return uuid.v4();
  }
}
