import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { DNS } from './types';

export default {
  async getDNS(payload:RequestPayload<null>): Promise<ApiResponse<DNS[]>> {
    return apiClient.get<DNS[]>(
      `/api/dns`,
        payload
    );
  },
  async deletedDNS(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/dns/` + payload.payload,
        payload
    );
  },
  async createDNS(payload:RequestPayload<DNS>): Promise<ApiResponse<DNS>> {
    return apiClient.post<DNS>(
        `/api/dns`,
        payload
    );
  },
  async editDNS(payload:RequestPayload<DNS>): Promise<ApiResponse<DNS>> {
    const id = payload.payload.id
    delete payload.payload.id
    return apiClient.put<DNS>(
        `/api/dns/${id}`,
        payload
    );
  },
};
