import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {Account} from './types';

export default {
  async getAccounts(payload:RequestPayload<null>): Promise<ApiResponse<Account[]>> {
    return apiClient.get<Account[]>(
      `/api/accounts`,
        payload
    );
  }
};
