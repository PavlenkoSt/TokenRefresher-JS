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
exports.refreshAndExecuteQueue = exports.addToQueue = exports.isRefreshing = void 0;
exports.isRefreshing = false;
let queue = [];
const addToQueue = ({ resolveAction, actionBeforeResolving, }) => new Promise((resolve, reject) => {
    queue.push({
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
exports.addToQueue = addToQueue;
const refreshAndExecuteQueue = ({ refreshToken, onRefreshSuccess, retries = 5, retryDelay = 300, onRefreshFailed, }) => __awaiter(void 0, void 0, void 0, function* () {
    exports.isRefreshing = true;
    let tokenRefreshed = false;
    let retriesLeft = retries;
    let token = null;
    while (retriesLeft > 0 && !tokenRefreshed) {
        try {
            const tokenResponse = yield refreshToken();
            if (tokenResponse) {
                tokenRefreshed = true;
                token = tokenResponse;
            }
            retriesLeft--;
        }
        catch (e) {
            retriesLeft--;
        }
        if (retriesLeft > 0) {
            yield new Promise((res) => setTimeout(res, retryDelay));
        }
    }
    if (!token) {
        queue.forEach((v) => v.reject("Token wasnt refresh -> refreshAndExecuteQueue"));
        queue = [];
        if (onRefreshFailed) {
            onRefreshFailed();
        }
    }
    else {
        onRefreshSuccess(token);
        yield Promise.all(queue.map((v) => v.resolve(token)));
        queue = [];
    }
    exports.isRefreshing = false;
});
exports.refreshAndExecuteQueue = refreshAndExecuteQueue;
const run = ({ axiosInstance, refreshToken, preventRefresh, onRefreshFailed, onRefreshSuccess, retries = 5, retryDelay = 300, }) => {
    axiosInstance.interceptors.response.use((response) => __awaiter(void 0, void 0, void 0, function* () {
        return response;
    }), (error) => __awaiter(void 0, void 0, void 0, function* () {
        const originalRequest = error.config;
        const prevented = preventRefresh(error);
        if (prevented || error.response.status !== 401)
            return Promise.reject(error);
        const resultPromise = (0, exports.addToQueue)({
            resolveAction: () => axiosInstance.request(originalRequest),
            actionBeforeResolving: (token) => (originalRequest.headers.Authorization = `Bearer ${token}`),
        });
        if (!exports.isRefreshing) {
            (0, exports.refreshAndExecuteQueue)({
                refreshToken,
                retries,
                retryDelay,
                onRefreshSuccess: (token) => {
                    originalRequest.headers["Authorization"] = `Bearer ${token}`;
                    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
                    if (onRefreshSuccess)
                        onRefreshSuccess(token);
                },
                onRefreshFailed,
            });
        }
        return resultPromise;
    }));
};
exports.default = run;
//# sourceMappingURL=index.js.map