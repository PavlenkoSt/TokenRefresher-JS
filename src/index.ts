import { AxiosInstance, AxiosResponse } from "axios";

export let isTokenRefreshing = false;
export let refreshQueue: any[] = [];

const retries = 5;

export const addToQueueInPromiseWrapper = (
  resolveAction: (token: string) => Promise<AxiosResponse<any, any>>,
  actionBeforeResolving?: (token: string) => void
) =>
  new Promise((resolve, reject) => {
    refreshQueue.push({
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

export const initTokenRefreshingAndExecuteAllQueue = async (
  actionTokenRefresh: () => Promise<string>,
  actionTokenRefreshed: (token: string) => void
) => {
  isTokenRefreshing = true;

  const tokenResponse = await actionTokenRefresh();

  if (!tokenResponse) {
    refreshQueue.forEach((v) =>
      v.reject("Token wasnt refresh -> initTokenRefreshingAndExecuteAllQueue")
    );
    refreshQueue = [];
  } else {
    actionTokenRefreshed(tokenResponse);

    await Promise.all(refreshQueue.map((v) => v.resolve(tokenResponse)));
    refreshQueue = [];
  }

  isTokenRefreshing = false;
};

const run = ({
  axiosInstance,
  refreshToken,
  validationBeforeRefresh,
  afterTokenRefreshFailed,
  afterTokenRefreshedSuccess,
}: {
  axiosInstance: AxiosInstance;
  validationBeforeRefresh: (error: any) => any;
  refreshToken: () => Promise<string>;
  afterTokenRefreshedSuccess?: (token: string) => void;
  afterTokenRefreshFailed?: () => void;
}) => {
  axiosInstance.interceptors.response.use(
    async (response) => {
      return response;
    },
    async function (error) {
      const originalRequest = error.config;

      originalRequest._retry =
        typeof originalRequest._retry === "undefined"
          ? 0
          : ++originalRequest._retry;

      const validated = validationBeforeRefresh(error);

      if (originalRequest._retry === retries) {
        if (afterTokenRefreshFailed) afterTokenRefreshFailed();
        return Promise.reject(error);
      }

      if (!validated) return Promise.reject(error);

      const resultPromise = addToQueueInPromiseWrapper(
        () => axiosInstance.request(originalRequest),
        (token) => (originalRequest.headers.Authorization = `Bearer ${token}`)
      );

      if (!isTokenRefreshing) {
        initTokenRefreshingAndExecuteAllQueue(refreshToken, (token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;

          if (afterTokenRefreshedSuccess) afterTokenRefreshedSuccess(token);
        });
      }

      return resultPromise;
    }
  );
};

export default run;
