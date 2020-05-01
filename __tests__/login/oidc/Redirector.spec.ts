/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import "reflect-metadata";
import Redirector from "../../../src/login/oidc/Redirector";
import { EnvironmentDetectorMock } from "../../../src/util/__mocks__/EnvironmentDetector";

/**
 * Test for Redirector
 */
describe("Redirector", () => {
  const defaultMocks = {
    environmentDetector: EnvironmentDetectorMock
  };
  function getRedirector(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): Redirector {
    return new Redirector(
      mocks.environmentDetector ?? defaultMocks.environmentDetector
    );
  }

  describe("Redirect", () => {
    const {
      location,
      history: { replaceState }
    } = window;

    beforeEach(() => {
      delete window.location;
      delete window.history.replaceState;
      window.location = {
        href: "https://coolSite.com"
      } as Location;
      window.history.replaceState = jest.fn();
    });

    afterEach(() => {
      window.location = location;
      window.history.replaceState = replaceState;
    });

    it("does not redirect if the environment is now browser", () => {
      defaultMocks.environmentDetector.detect.mockReturnValueOnce("server");
      const redirector = getRedirector();
      const neededAction = redirector.redirect("https://someUrl.com/redirect");
      expect(window.history.replaceState).not.toHaveBeenCalled();
      expect(window.location.href).toBe("https://coolSite.com");
      expect(neededAction).toMatchObject({
        actionType: "redirect",
        redirectUrl: "https://someUrl.com/redirect"
      });
    });

    it("redirects using href", () => {
      const redirector = getRedirector();
      const neededAction = redirector.redirect("https://someUrl.com/redirect");
      expect(window.history.replaceState).not.toHaveBeenCalled();
      expect(window.location.href).toBe("https://someUrl.com/redirect");
      expect(neededAction).toMatchObject({
        actionType: "inaction"
      });
    });

    it("redirects using replaceState", () => {
      const redirector = getRedirector();
      const neededAction = redirector.redirect("https://someUrl.com/redirect", {
        redirectByReplacingState: true
      });
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        "",
        "https://someUrl.com/redirect"
      );
      expect(window.location.href).toBe("https://coolSite.com");
      expect(neededAction).toMatchObject({
        actionType: "inaction"
      });
    });
  });
});
