import axios, {AxiosError} from 'axios';

import {ApiRequestParams, ApiResponse, ApiError} from './types';
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
  let error:ApiError = {
    code: '-1',
    message: '',
    data: null,
    statusCode: -1
  };

  try {
    response = await axios.request({ url, data, method: params.method, headers: builtHeader as any });
  } catch (err: any) {
    error = <ApiError>{
      code: err ? err.code : '-1',
      message: err ? err.message : '',
      data: (err && err.response) ? err.response.data : null,
      statusCode: (err && err.response) ? err.response.status : -1,
    };
    if (error.statusCode === 401) {
      let old = error.message
      error.message = old + ". Please refresh the page if the issue continues."
    }
    throw error;
  }

  return { statusCode: response ? response.status : error.statusCode, body: response ? response.data : error };
}

export { apiRequest };
