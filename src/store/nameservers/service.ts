import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { NameServerGroup } from './types';

export default {
  async getNameServerGroups(payload:RequestPayload<null>): Promise<ApiResponse<NameServerGroup[]>> {
    return apiClient.get<NameServerGroup[]>(
      `/api/dns/nameservers`,
        payload
    );
  },
  async deletedNameServerGroup(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/dns/nameservers/` + payload.payload,
        payload
    );
  },
  async createNameServerGroup(payload:RequestPayload<NameServerGroup>): Promise<ApiResponse<NameServerGroup>> {
    return apiClient.post<NameServerGroup>(
        `/api/dns/nameservers`,
        payload
    );
  },
  async editNameServerGroup(payload:RequestPayload<NameServerGroup>): Promise<ApiResponse<NameServerGroup>> {
    const id = payload.payload.id
    delete payload.payload.id
    return apiClient.put<NameServerGroup>(
        `/api/dns/nameservers/${id}`,
        payload
    );
  },
};
