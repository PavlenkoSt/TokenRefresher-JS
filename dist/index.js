"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTokenRefreshingAndExecuteAllQueue = exports.addToQueueInPromiseWrapper = exports.refreshQueue = exports.isTokenRefreshing = void 0;
exports.isTokenRefreshing = false;
exports.refreshQueue = [];
const retries = 5;
const addToQueueInPromiseWrapper = (resolveAction, actionBeforeResolving) => new Promise((resolve, reject) => {
    exports.refreshQueue.push({
        resolve: (token) => {
            if (actionBeforeResolving) {
                actionBeforeResolving(token);
            }
            resolve(resolveAction(token));
        },
        reject: (err) => {
            reject(err);
        },
    });
});
exports.addToQueueInPromiseWrapper = addToQueueInPromiseWrapper;
const initTokenRefreshingAndExecuteAllQueue = (actionTokenRefresh, actionTokenRefreshed) => __awaiter(void 0, void 0, void 0, function* () {
    exports.isTokenRefreshing = true;
    const tokenResponse = yield actionTokenRefresh();
    if (!tokenResponse) {
        exports.refreshQueue.forEach((v) => v.reject("Token wasnt refresh -> initTokenRefreshingAndExecuteAllQueue"));
        exports.refreshQueue = [];
    }
    else {
        actionTokenRefreshed(tokenResponse);
        yield Promise.all(exports.refreshQueue.map((v) => v.resolve(tokenResponse)));
        exports.refreshQueue = [];
    }
    exports.isTokenRefreshing = false;
});
exports.initTokenRefreshingAndExecuteAllQueue = initTokenRefreshingAndExecuteAllQueue;
const run = ({ axiosInstance, refreshToken, validationBeforeRefresh, afterTokenRefreshFailed, afterTokenRefreshedSuccess, }) => {
    axiosInstance.interceptors.response.use((response) => __awaiter(void 0, void 0, void 0, function* () {
        return response;
    }), function (error) {
        return __awaiter(this, void 0, void 0, function* () {
            const originalRequest = error.config;
            originalRequest._retry =
                typeof originalRequest._retry === "undefined"
                    ? 0
                    : ++originalRequest._retry;
            const validated = validationBeforeRefresh(error);
            if (originalRequest._retry === retries) {
                if (afterTokenRefreshFailed)
                    afterTokenRefreshFailed();
                return Promise.reject(error);
            }
            if (!validated)
                return Promise.reject(error);
            const resultPromise = (0, exports.addToQueueInPromiseWrapper)(() => axiosInstance.request(originalRequest), (token) => (originalRequest.headers.Authorization = `Bearer ${token}`));
            if (!exports.isTokenRefreshing) {
                (0, exports.initTokenRefreshingAndExecuteAllQueue)(refreshToken, (token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    if (afterTokenRefreshedSuccess)
                        afterTokenRefreshedSuccess(token);
                });
            }
            return resultPromise;
        });
    });
};
exports.default = run;
//# sourceMappingURL=index.js.map