import { RequestInfo, RequestInit, Response } from "node-fetch";
import ISolidSession from "./ISolidSession";
import ILoginInputOptions from "./ILoginInputOptions";

export default class AuthFetcher {
  async login(options: ILoginInputOptions): Promise<string> {
    throw new Error("Not Implemented");
  }

  async fetch(url: RequestInfo, init: RequestInit): Promise<Response> {
    throw new Error("Not Implemented");
  }

  async logout(): Promise<void> {
    throw new Error("Not Implemented");
  }

  async getSession(): Promise<ISolidSession> {
    throw new Error("Not Implemented");
  }

  async uniqueLogin(options: ILoginInputOptions): Promise<string> {
    throw new Error("Not Implemented");
  }

  onSession(callback: (session: ISolidSession) => unknown): void {
    throw new Error("Not Implemented");
  }

  async handleRedirect(url: string): Promise<void> {
    throw new Error("Not Implemented");
  }

  customAuthFetcher(options: {}): unknown {
    throw new Error("Not Implemented");
  }
}
