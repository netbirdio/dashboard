import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { Rule } from './types';
import {SetupKey} from "../setup-key/types";

export default {
  async getRules(payload:RequestPayload<null>): Promise<ApiResponse<Rule[]>> {
    return apiClient.get<Rule[]>(
      `/api/rules`,
        payload
    );
  },
  async deletedRule(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/rules/` + payload.payload,
        payload
    );
  },
  async createRule(payload:RequestPayload<Rule>): Promise<ApiResponse<Rule>> {
    return apiClient.post<Rule>(
        `/api/rules`,
        payload
    );
  },
  async editRule(payload:RequestPayload<Rule>): Promise<ApiResponse<Rule>> {
    return apiClient.put<Rule>(
        `/api/rules`,
        payload
    );
  },
};
