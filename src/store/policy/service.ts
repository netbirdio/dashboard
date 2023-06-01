import { ApiResponse, RequestPayload } from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { Policy } from './types';

export default {
    async getPolicies(payload: RequestPayload<null>): Promise<ApiResponse<Policy[]>> {
        return apiClient.get<Policy[]>(
            `/api/policies`,
            payload
        );
    },
    async deletedPolicy(payload: RequestPayload<string>): Promise<ApiResponse<any>> {
        return apiClient.delete<any>(
            `/api/policies/` + payload.payload,
            payload
        );
    },
    async createPolicy(payload: RequestPayload<Policy>): Promise<ApiResponse<Policy>> {
        return apiClient.post<Policy>(
            `/api/policies`,
            payload
        );
    },
    async editPolicy(payload: RequestPayload<Policy>): Promise<ApiResponse<Policy>> {
        const id = payload.payload.id
        delete payload.payload.id
        return apiClient.put<Policy>(
            `/api/policies/${id}`,
            payload
        );
    },
};
