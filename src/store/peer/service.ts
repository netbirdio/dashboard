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
  /*
  async addQuantidade(payload: MovimentoEstoque): Promise<ApiResponse<MovimentoEstoqueResponse>> {
    return apiClient.put<MovimentoEstoqueResponse>(
      `/unidade_produto/app/adicionar`,
      payload
    );
  },
  async updateCodigoBarrasProduto(payload: CodBarrasRequest): Promise<ApiResponse<CodBarrasResponse>> {
    return apiClient.put<CodBarrasResponse>(
      `/produto/app/atualiza_cod_barras`,
      payload
    );
  }
 */
};
