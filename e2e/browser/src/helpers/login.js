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
exports.__esModule = true;
exports.loginGluu = exports.essGithubLogin = exports.essTwitterLogin = exports.essGoogleLogin = exports.loginNss = void 0;
// Login via ESS Broker using various Auth0 workflows.
var testcafe_1 = require("testcafe");
var LoginPage_1 = require("../page-models/LoginPage");
// Login using NSS User
function loginNss(brokerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Log in via ESS Broker service
                return [4 /*yield*/, LoginPage_1["default"].submitLoginForm(brokerUrl)];
                case 1:
                    // Log in via ESS Broker service
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t
                            .typeText("#username", username)
                            .typeText("#password", password)
                            .click("#login")];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.loginNss = loginNss;
// Login using Google
function essGoogleLogin(brokerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("STARTING GOOGLE LOGIN");
                    // Log in via ESS Broker service
                    return [4 /*yield*/, LoginPage_1["default"].submitLoginForm(brokerUrl)];
                case 1:
                    // Log in via ESS Broker service
                    _a.sent();
                    // Select Google
                    return [4 /*yield*/, testcafe_1.t.click('#wrap [alt="Google"]')];
                case 2:
                    // Select Google
                    _a.sent();
                    // Enter login information
                    return [4 /*yield*/, testcafe_1.t
                            .typeText("#identifierId", username)
                            .click("#identifierNext .VfPpkd-RLmnJb")
                            .typeText("#password .whsOnd.zHQkBf", password)
                            .click("#passwordNext .VfPpkd-RLmnJb")];
                case 3:
                    // Enter login information
                    _a.sent();
                    // Authorize the application
                    return [4 /*yield*/, testcafe_1.t.click("#wrap .btn.btn-success.btn-large")];
                case 4:
                    // Authorize the application
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.essGoogleLogin = essGoogleLogin;
// Login using Twitter
function essTwitterLogin(brokerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Log in via ESS Broker service
                return [4 /*yield*/, LoginPage_1["default"].submitLoginForm(brokerUrl)];
                case 1:
                    // Log in via ESS Broker service
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t.click('#wrap [alt="Auth0"]')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t.click(testcafe_1.Selector("#auth0-lock-container-1 div")
                            .withText("Sign in with Twitter")
                            .nth(19))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t
                            .typeText("#username_or_email", username)
                            .typeText("#password", password)
                            .click("#allow")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t.click("#wrap > div.container.main > div > form > div:nth-child(2) > input.btn.btn-success.btn-large")];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.essTwitterLogin = essTwitterLogin;
// ESS (GitHub) User
function essGithubLogin(brokerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Log in via ESS Broker service
                return [4 /*yield*/, LoginPage_1["default"].submitLoginForm(brokerUrl)];
                case 1:
                    // Log in via ESS Broker service
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t.click('#wrap [alt="Auth0"]')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t.click(testcafe_1.Selector("#auth0-lock-container-1 div")
                            .withText("Sign in with GitHub")
                            .nth(19))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t
                            .typeText("main .form-control.input-block", username)
                            .typeText(testcafe_1.Selector("main .form-control.form-control.input-block").nth(1), password)
                            .click("main .btn.btn-primary.btn-block")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t.click("#wrap .btn.btn-success.btn-large")];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.essGithubLogin = essGithubLogin;
/**
 *
 * @param brokerURL
 * @param username
 * @param password
 * @param waitTime
 */
function loginGluu(brokerURL, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Log in via ESS Broker service
                return [4 /*yield*/, LoginPage_1["default"].submitLoginForm(brokerURL)];
                case 1:
                    // Log in via ESS Broker service
                    _a.sent();
                    return [4 /*yield*/, testcafe_1.t
                            .typeText("#loginForm\\:username", username)
                            .typeText("#loginForm\\:password", password)
                            .click("#loginForm\\:loginButton")];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.loginGluu = loginGluu;
