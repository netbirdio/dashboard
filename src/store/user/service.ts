import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {User, UserToSave} from './types';
import {SpecificPAT} from "../personal-access-token/types";

export default {
  async getUsers(payload:RequestPayload<null>): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>(
      `/api/users`,
        payload
    );
  },
  async editUser(payload:RequestPayload<UserToSave>): Promise<ApiResponse<User>> {
    const id = payload.payload.id
    // @ts-ignore
    delete payload.payload.id
    return apiClient.put<User>(
        `/api/users/${id}`,
        payload
    );
  },
  async createUser(payload:RequestPayload<UserToSave>): Promise<ApiResponse<User>> {
    // @ts-ignore
    return apiClient.post<User>(
        `/api/users`,
        payload
    );
  },
  async deleteUser(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/users/` + payload.payload,
        payload
    );
  },
};
