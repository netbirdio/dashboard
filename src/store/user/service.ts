import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { User } from './types';

export default {
  async getUsers(payload:RequestPayload<null>): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>(
      `/api/users`,
        payload
    );
  }
};
