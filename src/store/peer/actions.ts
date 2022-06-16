import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {Peer, PeerGroupsToSave} from './types';
import {
  ApiError,
  ChangeResponse,
  CreateResponse,
  DeleteResponse,
  RequestPayload
} from '../../services/api-client/types';
import {Group} from "../group/types";
import {SetupKey} from "../setup-key/types";

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
  resetDeletedPeer: createAction('RESET_DELETED_PEER')<null>(),
  setDeletePeer: createAction('SET_DELETE_PEER')<DeleteResponse<string | null>>(),

  saveGroups: createAsyncAction(
      'SAVE_PEERS_GROUPS_REQUEST',
      'SAVE_PEERS_GROUPS_SUCCESS',
      'SAVE_PEERS_GROUPS_FAILURE',
  )<RequestPayload<PeerGroupsToSave>, ChangeResponse<Group[] | null>, ChangeResponse<Group[] | null>>(),
  setSavedGroups: createAction('SET_SAVE_PEER_GROUPS')<ChangeResponse<Group[] | null>>(),
  resetSavedGroups: createAction('RESET_SAVE_PEER_GROUPS')<null>(),

  removePeer:  createAction('REMOVE_PEER')<string>(),
  setPeer: createAction('SET_PEER')<Peer | null>(),
  setUpdateGroupsVisible: createAction('SET_UPDATE_GROUPS_VISIBLE')<boolean>(),
  updatePeer: createAsyncAction(
      'UPDATE_PEER',
      'UPDATE_PEER_SUCCESS',
      'UPDATE_PEER_FAILURE',
  )<RequestPayload<Peer>, ChangeResponse<Peer | null>, ChangeResponse<Peer | null>>(),
  setUpdatedPeer: createAction('SET_UPDATED_PEER')<ChangeResponse<Peer[] | null>>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
