"use strict";
/*
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a, _b;
exports.__esModule = true;
var testcafe_1 = require("testcafe");
var FetchPage_1 = require("./page-models/FetchPage");
var login_1 = require("./helpers/login");
var authorizeClientApp_1 = require("./helpers/authorizeClientApp");
// Could probably provide this via a system environment variable too...
// const testSuite = require("./test-suite.json");
var testSuite = require("./test-suite.json");
// This is the deployed client application that we'll be using to exercise
// various authentication scenarios. We expect the system environment value to
// point at a deployed instance (e.g. an automated Vercel deployment), but I
// don't think it makes sense to default to a hard-coded Vercel instance.
// Instead, for running locally, it seems helpful to default to 'localhost'
// instance.
var clientApplicationUrl = (_a = process.env.E2E_DEMO_CLIENT_APP_URL) !== null && _a !== void 0 ? _a : "http://localhost:3001";
var testCafeWaitTime = (_b = process.env.E2E_TESTCAFE_WAIT_TIME) !== null && _b !== void 0 ? _b : "1000";
fixture("Automated tests using client application: [" + clientApplicationUrl + "]").page(clientApplicationUrl);
function selectBrokeredIdp(brokeredIdp) {
    return __awaiter(this, void 0, void 0, function () {
        var selectIdp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testcafe_1.Selector("h2").withText("How would you like to login?").exists];
                case 1:
                    selectIdp = _a.sent();
                    if (!selectIdp) return [3 /*break*/, 3];
                    return [4 /*yield*/, testcafe_1.t.click("[alt=" + brokeredIdp + "]")];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function performLogin(podServerConfig, testUserName) {
    return __awaiter(this, void 0, void 0, function () {
        var testUserPassword, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    testUserPassword = process.env[podServerConfig.envTestUserPassword];
                    return [4 /*yield*/, selectBrokeredIdp(podServerConfig.brokeredIdp)];
                case 1:
                    _c.sent();
                    _a = podServerConfig.brokeredIdp;
                    switch (_a) {
                        case "Gluu": return [3 /*break*/, 2];
                        case "nss": return [3 /*break*/, 4];
                    }
                    return [3 /*break*/, 6];
                case 2: return [4 /*yield*/, login_1.loginGluu(podServerConfig.identityProvider, testUserName, testUserPassword)];
                case 3:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 4: return [4 /*yield*/, login_1.loginNss(podServerConfig.identityProvider, testUserName, testUserPassword)];
                case 5:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 6: throw new Error("Unknown login mechanism in test suite configuration: [" + podServerConfig.brokeredIdp + "]");
                case 7:
                    _b = podServerConfig.authorizeClientAppMechanism;
                    switch (_b) {
                        case "ess": return [3 /*break*/, 8];
                        case "nss": return [3 /*break*/, 10];
                    }
                    return [3 /*break*/, 12];
                case 8: return [4 /*yield*/, authorizeClientApp_1.authorizeEss()];
                case 9:
                    _c.sent();
                    return [3 /*break*/, 13];
                case 10: return [4 /*yield*/, authorizeClientApp_1.authorizeNss()];
                case 11:
                    _c.sent();
                    return [3 /*break*/, 13];
                case 12: throw new Error("Unknown login mechanism in test suite configuration: [" + podServerConfig.authorizeClientAppMechanism + "]");
                case 13: return [4 /*yield*/, testcafe_1.t.wait(parseInt(testCafeWaitTime, 10))];
                case 14:
                    _c.sent();
                    return [4 /*yield*/, testcafe_1.t.expect(FetchPage_1["default"].fetchButton.exists).ok("Logged in")];
                case 15:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Run through all the tests defined in our test suite.
testSuite.podServerList.forEach(function (server) {
    var testUserName = process.env[server.envTestUserName];
    if (!testUserName || testUserName.trim().length === 0) {
        // test(`Pod Server - IdP [${server.description}], no environment variable set for [${server.envTestUserName}], so skipping this server.`, async () => {});
        console.log("Pod Server - IdP [" + server.description + "], no environment variable set for [" + server.envTestUserName + "], so skipping this server.");
    }
    else {
        testSuite.testList.forEach(function (data) {
            test("Pod Server - IdP [" + server.description + "], test [" + data.name + "]", function (t) { return __awaiter(void 0, void 0, void 0, function () {
                var podRoot, resourceToGet, responseBody, expected;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!data.performLogin) return [3 /*break*/, 2];
                            return [4 /*yield*/, performLogin(server, testUserName)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            podRoot = server.podResourceServer.replace("<TEST USER NAME>", testUserName);
                            resourceToGet = data.resourceToGet.replace("<POD ROOT>", podRoot);
                            return [4 /*yield*/, t
                                    .selectText(FetchPage_1["default"].fetchUriTextbox)
                                    .typeText(FetchPage_1["default"].fetchUriTextbox, resourceToGet)
                                    .click(FetchPage_1["default"].fetchButton)
                                    .wait(parseInt(testCafeWaitTime, 10))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, FetchPage_1["default"].fetchResponseTextbox.textContent];
                        case 4:
                            responseBody = _a.sent();
                            expected = data.expectResponseContainsAnyOf.some(function (option) {
                                return responseBody.includes(option);
                            });
                            return [4 /*yield*/, t.expect(expected).ok()];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    }
});
