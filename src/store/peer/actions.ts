import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import { Peer } from './types';
import { RequestPayload } from '../../services/api-client/types';

const actions = {
  getPeers: createAsyncAction(
      'GET_PEERS_REQUEST',
      'GET_PEERS_SUCCESS',
      'GET_PEERS_FAILURE',
  )<RequestPayload<null>, Peer[], Error>(),
  setPeer: createAction('SET_PEER')<Peer>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
