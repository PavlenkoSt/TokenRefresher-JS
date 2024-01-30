import { AxiosInstance, AxiosResponse } from "axios";

export let isRefreshing = false;
let queue: {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}[] = [];

export const addToQueue = ({
  resolveAction,
  actionBeforeResolving,
}: {
  resolveAction: (token: string) => Promise<AxiosResponse<any, any>>;
  actionBeforeResolving?: (token: string) => void;
}) =>
  new Promise((resolve, reject) => {
    queue.push({
      resolve: (token: string) => {
        if (actionBeforeResolving) {
          actionBeforeResolving(token);
        }

        resolve(resolveAction(token));
      },
      reject: (err: any) => {
        reject(err);
      },
    });
  });

export const refreshAndExecuteQueue = async ({
  refreshToken,
  onRefreshSuccess,
  retries = 5,
  retryDelay = 300,
  onRefreshFailed,
}: {
  refreshToken: () => Promise<string>;
  retries?: number;
  retryDelay?: number;
  onRefreshSuccess: (token: string) => void;
  onRefreshFailed?: () => void;
}) => {
  isRefreshing = true;

  let tokenRefreshed = false;
  let retriesLeft = retries;

  let token: string | null = null;

  while (retriesLeft > 0 && !tokenRefreshed) {
    try {
      const tokenResponse = await refreshToken();

      if (tokenResponse) {
        tokenRefreshed = true;
        token = tokenResponse;
      }

      retriesLeft--;
    } catch (e) {
      retriesLeft--;
    }

    if (retriesLeft > 0) {
      await new Promise((res) => setTimeout(res, retryDelay));
    }
  }

  if (!token) {
    queue.forEach((v) =>
      v.reject("Token wasnt refresh -> refreshAndExecuteQueue")
    );
    queue = [];
    if (onRefreshFailed) {
      onRefreshFailed();
    }
  } else {
    onRefreshSuccess(token);

    await Promise.all(queue.map((v) => v.resolve(token as string)));
    queue = [];
  }

  isRefreshing = false;
};

const run = ({
  axiosInstance,
  refreshToken,
  preventRefresh,
  onRefreshFailed,
  onRefreshSuccess,
  retries = 5,
  retryDelay = 300,
}: {
  axiosInstance: AxiosInstance;
  preventRefresh: (error: any) => any;
  refreshToken: () => Promise<string>;
  onRefreshSuccess?: (token: string) => void;
  onRefreshFailed?: () => void;
  retries?: number;
  retryDelay?: number;
}) => {
  axiosInstance.interceptors.response.use(
    async (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      const prevented = preventRefresh(error);
      if (prevented || error.response.status !== 401)
        return Promise.reject(error);

      const resultPromise = addToQueue({
        resolveAction: () => axiosInstance.request(originalRequest),
        actionBeforeResolving: (token) =>
          (originalRequest.headers.Authorization = `Bearer ${token}`),
      });

      if (!isRefreshing) {
        refreshAndExecuteQueue({
          refreshToken,
          retries,
          retryDelay,
          onRefreshSuccess: (token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            axiosInstance.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${token}`;
            if (onRefreshSuccess) onRefreshSuccess(token);
          },
          onRefreshFailed,
        });
      }

      return resultPromise;
    }
  );
};

export default run;
