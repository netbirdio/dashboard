import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { Route } from './types';

export default {
  async getRoutes(payload:RequestPayload<null>): Promise<ApiResponse<Route[]>> {
    return apiClient.get<Route[]>(
      `/api/routes`,
        payload
    );
  },
  async deletedRoute(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/routes/` + payload.payload,
        payload
    );
  },
  async createRoute(payload:RequestPayload<Route>): Promise<ApiResponse<Route>> {
    return apiClient.post<Route>(
        `/api/routes`,
        payload
    );
  },
  async editRoute(payload:RequestPayload<Route>): Promise<ApiResponse<Route>> {
    const id = payload.payload.id
    delete payload.payload.id
    return apiClient.put<Route>(
        `/api/routes/${id}`,
        payload
    );
  },
};
