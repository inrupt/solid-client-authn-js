(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('oidc-client')) :
    typeof define === 'function' && define.amd ? define(['exports', 'oidc-client'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.LitSolidCore = {}, global.oidcClient));
}(this, (function (exports, oidcClient) { 'use strict';

    Object.defineProperty(exports, 'CordovaIFrameNavigator', {
        enumerable: true,
        get: function () {
            return oidcClient.CordovaIFrameNavigator;
        }
    });
    Object.defineProperty(exports, 'CordovaPopupNavigator', {
        enumerable: true,
        get: function () {
            return oidcClient.CordovaPopupNavigator;
        }
    });
    Object.defineProperty(exports, 'InMemoryWebStorage', {
        enumerable: true,
        get: function () {
            return oidcClient.InMemoryWebStorage;
        }
    });
    Object.defineProperty(exports, 'Log', {
        enumerable: true,
        get: function () {
            return oidcClient.Log;
        }
    });
    Object.defineProperty(exports, 'OidcClient', {
        enumerable: true,
        get: function () {
            return oidcClient.OidcClient;
        }
    });
    Object.defineProperty(exports, 'SessionMonitor', {
        enumerable: true,
        get: function () {
            return oidcClient.SessionMonitor;
        }
    });
    Object.defineProperty(exports, 'User', {
        enumerable: true,
        get: function () {
            return oidcClient.User;
        }
    });
    Object.defineProperty(exports, 'UserManager', {
        enumerable: true,
        get: function () {
            return oidcClient.UserManager;
        }
    });
    Object.defineProperty(exports, 'Version', {
        enumerable: true,
        get: function () {
            return oidcClient.Version;
        }
    });
    Object.defineProperty(exports, 'WebStorageStateStore', {
        enumerable: true,
        get: function () {
            return oidcClient.WebStorageStateStore;
        }
    });

    Object.defineProperty(exports, '__esModule', { value: true });

})));
