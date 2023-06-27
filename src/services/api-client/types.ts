import { Method } from "axios";

export interface RequestPayload<T> {
  getAccessTokenSilently: any | null;
  queryParams?: any | null;
  payload: T;
}

export interface RequestHeader {
  "content-type": string;
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
  params?: any;
  data: unknown;
  urlBase: string;
}

export interface ApiError {
  code: string;
  message: string;
  data?: any;
  statusCode: number;
}

export interface DeleteResponse<T> {
  loading: boolean;
  success: boolean;
  failure: boolean;
  error: ApiError | null;
  data: T;
}

export interface CreateResponse<T> {
  loading: boolean;
  success: boolean;
  failure: boolean;
  error: ApiError | null;
  data: T;
}

export interface ChangeResponse<T> {
  loading: boolean;
  success: boolean;
  failure: boolean;
  error: ApiError | null;
  data: T;
}
