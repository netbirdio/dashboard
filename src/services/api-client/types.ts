import { Method } from 'axios';

export interface RequestPayload<T> {
  getAccessTokenSilently: any,
  payload:T
}

export interface RequestHeader {
  'content-type': string;
  [key: string]: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  body: T;
}

export interface ApiClientParams {
  urlBase: string;
}

export interface RequestConfig {
  onUploadProgress?: (event: ProgressEvent) => void;
  extraHeaders?: Record<string, unknown>;
}

export interface ApiRequestParams extends RequestConfig {
  method: Method;
  url: string;
  data: unknown;
  urlBase: string;
}
