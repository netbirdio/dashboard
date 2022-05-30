import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {Group} from './types';

const baseUrl = `/api/groups`
export default {
  async getGroups(payload:RequestPayload<null>): Promise<ApiResponse<Group[]>> {
    return apiClient.get<Group[]>(
      `${baseUrl}`,
        payload
    );
  },
  async getGroup(payload:RequestPayload<null>): Promise<ApiResponse<Group>> {
    return apiClient.get<Group>(
        `${baseUrl}/` + payload.payload,
        payload
    );
  },
  async deleteGroup(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `${baseUrl}/` + payload.payload,
        payload
    );
  },
  async createGroup(payload:RequestPayload<Group>): Promise<ApiResponse<Group>> {
    return apiClient.post<Group>(
        `${baseUrl}`,
        payload
    );
  },
};
