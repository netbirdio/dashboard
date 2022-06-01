import { Method } from 'axios';
import { ApiClientParams, ApiResponse, RequestConfig } from './types';
import { apiRequest } from './api-request';

class ApiClient {
  urlBase: string;

  constructor(params: ApiClientParams) {
    this.urlBase = params.urlBase;
  }

  request<T>(
    method: Method,
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return apiRequest<T>({
      url,
      data,
      method,
      urlBase: this.urlBase,
      ...config,
    });
  }

  get<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, data, config);
  }

  post<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  put<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  patch<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  delete<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, data, config);
  }
}

export { ApiClient };
