import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {Account} from './types';

export default {
  async getAccounts(payload:RequestPayload<null>): Promise<ApiResponse<Account[]>> {
    return apiClient.get<Account[]>(
      `/api/accounts`,
        payload
    );
  },
  async updateAccount(payload:RequestPayload<Account>): Promise<ApiResponse<Account>> {
    const id = payload.payload.id
    return apiClient.put<Account>(
        `/api/accounts/${id}`,
        payload
    );
  },
  async deleteAccount(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/accounts/` + payload.payload,
        payload
    );
  },
};
