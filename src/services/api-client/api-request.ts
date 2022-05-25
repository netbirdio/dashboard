import axios, {AxiosError} from 'axios';

import {ApiRequestParams, ApiResponse} from './types';
import {headersFactory, RequestHeader} from './header-factory';

/*axios.interceptors.response.use(undefined, err => {
  let res = err.response;
  if (res.status === 401) {
  }
})*/

async function apiRequest<T>(params: ApiRequestParams): Promise<ApiResponse<T>> {
  const data = params.data ? (params.data as any).payload : undefined;
  const url = `${params.urlBase}${params.url}`;

  const extraHeaders = params.extraHeaders || {};
  const headers = await headersFactory((params.data as any).getAccessTokenSilently);

  const builtHeader: RequestHeader = { ...headers, ...extraHeaders };

  let response;
  let error = {
    statusCode: -1
  };

  try {
    response = await axios.request({ url, data, method: params.method, headers: builtHeader as any });
  } catch (err: any) {
    const errorResponse = (err && err.response) || {};

    error = {
      ...errorResponse.data,
      statusCode: errorResponse.status,
    };

    throw error;
  }

  return { statusCode: response ? response.status : error.statusCode, body: response ? response.data : error };
}

export { apiRequest };
