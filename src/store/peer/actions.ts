import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import { Peer } from './types';
import {ApiError, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getPeers: createAsyncAction(
      'GET_PEERS_REQUEST',
      'GET_PEERS_SUCCESS',
      'GET_PEERS_FAILURE',
  )<RequestPayload<null>, Peer[], ApiError>(),
  deletedPeer: createAsyncAction(
      'DELETE_PEER_REQUEST',
      'DELETE_PEER_SUCCESS',
      'DELETE_PEER_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletePeer: createAction('SET_DELETE_PEER')<DeleteResponse<string | null>>(),
  removePeer:  createAction('REMOVE_PEER')<string>(),
  setPeer: createAction('SET_PEER')<Peer>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
