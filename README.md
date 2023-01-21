# Token-refresher-module

This module is guaranteed to send 1 request for a refresh token even with parallel requests. It also provides methods for mixing Axios requests with any other types of requests (such as web sockets).

## Installation

```bash
yarn add token-refresher-module
```

or

```bash
npm install token-refresher-module
```

## Basic Usage

```javascript
import axios from "axios";
import tokenRefresherModule from "token-refresher-module";

const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: "https://example.com/api",
});

const validationBeforeRefresh = (error) => {
  if (error.response.headers.userbanned) {
    return false;
  }
  return true;
};

const refreshToken = async () => {
  const token = await axiosInstance.post("refresh-token");
  return token;
};

const afterTokenRefreshedSuccess = () => {
  console.log("Token refreshed success");
};

const afterTokenRefreshFailed = () => {
  console.log("Token refreshing failed");
};

tokenRefresherModule({
  axiosInstance,
  validationBeforeRefresh,
  refreshToken,
  afterTokenRefreshedSuccess,
  afterTokenRefreshFailed,
});
```

## Util for socket connection (signalR)

Use such a utility in the connect block when you need a refresh token and try again.

```javascript
import {
  addToQueueInPromiseWrapper,
  initTokenRefreshingAndExecuteAllQueue,
  isTokenRefreshing,
} from "token-refresher-module";

const refreshTokenOnSignalHubConnection = async (
  connectToServerWithSocketsFn,
  isTokenRefreshing: boolean
) => {
  let result;

  if (isTokenRefreshing) {
    result = await addToQueueInPromiseWrapper(connectToServerWithSocketsFn);
  } else {
    result = await initTokenRefreshingAndExecuteAllQueue(
      connectToServerWithSocketsFn
    );
  }

  return result;
};
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
