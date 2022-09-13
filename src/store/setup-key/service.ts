import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {SetupKey, SetupKeyToSave} from './types';

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
  async createSetupKey(payload:RequestPayload<SetupKeyToSave>): Promise<ApiResponse<SetupKey>> {
    return apiClient.post<SetupKey>(
        `/api/setup-keys`,
        payload
    );
  },
  async editSetupKey(payload:RequestPayload<SetupKeyToSave>): Promise<ApiResponse<SetupKey>> {
    const id = payload.payload.id
    // @ts-ignore
    delete payload.payload.id
    return apiClient.put<SetupKey>(
        `/api/setup-keys/${id}`,
        payload
    );
  },
};
