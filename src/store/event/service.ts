import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { apiClient } from '../../services/api-client';
import {Event} from './types';

export default {
  async getEvents(payload:RequestPayload<null>): Promise<ApiResponse<Event[]>> {
    return apiClient.get<Event[]>(
      `/api/events`,
        payload
    );
  }
};
