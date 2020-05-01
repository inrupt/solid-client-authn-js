/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import IStorage from "./IStorage";

export default class NodeStorage implements IStorage {
  private map: Record<string, string> = {};
  async get(key: string): Promise<string | null> {
    return this.map[key] || null;
  }
  async set(key: string, value: string): Promise<void> {
    this.map[key] = value;
  }
  async delete(key: string): Promise<void> {
    delete this.map[key];
  }
}
