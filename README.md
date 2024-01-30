# axios-refresh-token

This simple module ensures the dispatch of a single request for a refresh token, even when handling parallel requests. Additionally, it offers methods for seamlessly integrating Axios requests with any socket libraries.

## Installation

```bash
yarn add axios-refresh-token
```

or

```bash
npm install axios-refresh-token
```

## Basic Usage

```javascript
import axios from "axios";
import tokenRefresherModule from "axios-refresh-token";

const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: "https://example.com/api",
});

const preventRefresh = (error) => {
  if (error.response.headers.userbanned) {
    return false;
  }
  return true;
};

const refreshToken = async () => {
  const token = await axiosInstance.post("refresh-token");
  return token;
};

const onRefreshSuccess = () => {
  console.log("Token refreshed success");
};

const onRefreshFailed = () => {
  console.log("Token refreshing failed");
};

tokenRefresherModule({
  axiosInstance,
  refreshToken,
  preventRefresh,
  onRefreshFailed, // optional
  onRefreshSuccess, // optional
  retries: 5, // optional, default 5
  retryDelay: 300, // optional, default 300
});
```

## Advance Usage

Employ this utility within the catch block when a refresh token is required, enabling a retry of the operation.

```javascript
import {
  addToQueue,
  refreshAndExecuteQueue,
  isRefreshing,
} from "axios-refresh-token";

const refreshTokenOnSignalHubConnection = async (
  connectToServerWithSocketsFn
) => {
  let result;

  if (isTokenRefreshing) {
    result = await addToQueue({
      resolveAction: connectToServerWithSocketsFn,
      actionBeforeResolving,
    });
  } else {
    result = await refreshAndExecuteQueue({
      onRefreshSuccess: connectToServerWithSocketsFn,
      refreshToken,
      retries, // optional, default 5
      retryDelay, // optional, default 300
      onRefreshFailed, // optional
    });
  }

  return result;
};
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
