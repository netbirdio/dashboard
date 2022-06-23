import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import { Peer } from './types';

export default {
  async getPeers(payload:RequestPayload<null>): Promise<ApiResponse<Peer[]>> {
    return apiClient.get<Peer[]>(
      `/api/peers`,
        payload
    );
  },
  async deletedPeer(payload:RequestPayload<string>): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(
        `/api/peers/` + payload.payload,
        payload
    );
  },
  async updatePeer(payload:RequestPayload<Peer>): Promise<ApiResponse<Peer>> {
    const id = payload.payload.id
    delete payload.payload.id
    return apiClient.put<Peer>(
        `/api/peers/${id}`,
        payload
    );
  }
};
