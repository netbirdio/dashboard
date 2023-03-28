import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {
  PersonalAccessToken,
  PersonalAccessTokenCreate, PersonalAccessTokenGenerated,
  SpecificPAT
} from './types';

export default {
  async getAllPersonalAccessTokens(payload:RequestPayload<string>): Promise<ApiResponse<PersonalAccessToken[]>> {
    return apiClient.get<PersonalAccessToken[]>(
      `/api/users/` + payload.payload + `/tokens`,
        payload
    );
  },
  async getPersonalAccessToken(payload:RequestPayload<SpecificPAT>): Promise<ApiResponse<PersonalAccessToken>> {
    return apiClient.get<PersonalAccessToken>(
      `/api/users/` + payload.payload.user_id + `/tokens/` + payload.payload.id,
        payload
    );
  },
  async deletePersonalAccessToken(payload:RequestPayload<SpecificPAT>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/users/` + payload.payload.user_id + `/tokens/` + payload.payload.id,
        payload
    );
  },
  async createPersonalAccessToken(payload:RequestPayload<PersonalAccessTokenCreate>): Promise<ApiResponse<PersonalAccessTokenGenerated>> {
    return apiClient.post<PersonalAccessTokenGenerated>(
        `/api/users/` + payload.payload.user_id + `/tokens`,
        payload
    );
  },
};
