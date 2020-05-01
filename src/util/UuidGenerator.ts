/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

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
