import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { DNSSettings } from './types';

export default {
  async getDNSSettings(payload:RequestPayload<null>): Promise<ApiResponse<DNSSettings>> {
    return apiClient.get<DNSSettings>(
      `/api/dns/settings`,
        payload
    );
  },
  async editDNSSettings(payload:RequestPayload<DNSSettings>): Promise<ApiResponse<DNSSettings>> {
    return apiClient.put<DNSSettings>(
        `/api/dns/settings`,
        payload
    );
  },
};
