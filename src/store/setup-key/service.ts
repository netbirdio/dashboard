import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {SetupKey, SetupKeyNew, SetupKeyRevoke} from './types';

export default {
  async getSetupKeys(payload:RequestPayload<null>): Promise<ApiResponse<SetupKey[]>> {
    return apiClient.get<SetupKey[]>(
      `/api/setup-keys`,
        payload
    );
  },
  async deleteSetupKey(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/setup-keys/` + payload.payload,
        payload
    );
  },
  async revokeSetupKey(payload:RequestPayload<SetupKeyRevoke>): Promise<ApiResponse<SetupKey>> {
    return apiClient.put<SetupKey>(
        `/api/setup-keys/` + payload.payload.Id,
        payload
    );
  },
  async renameSetupKey(payload:RequestPayload<any>): Promise<ApiResponse<SetupKey>> {
    return apiClient.put<SetupKey>(
        `/api/setup-keys/` + payload.payload.Id,
        payload
    );
  },
  async createSetupKey(payload:RequestPayload<SetupKey>): Promise<ApiResponse<SetupKey>> {
    return apiClient.post<SetupKey>(
        `/api/setup-keys`,
        payload
    );
  },
};
