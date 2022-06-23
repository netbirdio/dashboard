import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Peer } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, ChangeResponse, CreateResponse, DeleteResponse} from "../../services/api-client/types";
import {Group} from "../group/types";

type StateType = Readonly<{
  data: Peer[] | null;
  peer?: Peer | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  deletedPeer: DeleteResponse<string | null>;
  setUpdateGroupsVisible: boolean;
  savedGroups: ChangeResponse<Group[] | null>;
  updatedPeer: CreateResponse<Peer | null>;
}>;

const initialState: StateType = {
  data: [],
  peer: null,
  loading: false,
  failed: null,
  saving: false,
  deletedPeer: <DeleteResponse<string | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  setUpdateGroupsVisible: false,
  savedGroups: <ChangeResponse<Group[] | null>> {
    loading: false,
    success: false,
    failure: false,
    error: null,
    data: null
  },
  updatedPeer: <ChangeResponse<Peer | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
};

const data = createReducer<Peer[], ActionTypes>(initialState.data as Peer[])
  .handleAction(actions.getPeers.success,(_, action) => action.payload)
  .handleAction(actions.getPeers.failure, () => []);

const peer = createReducer<Peer | null, ActionTypes>(initialState.peer as Peer)
    .handleAction(actions.setPeer, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getPeers.request, () => true)
    .handleAction(actions.getPeers.success, () => false)
    .handleAction(actions.getPeers.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getPeers.request, () => null)
    .handleAction(actions.getPeers.success, () => null)
    .handleAction(actions.getPeers.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getPeers.request, () => true)
    .handleAction(actions.getPeers.success, () => false)
    .handleAction(actions.getPeers.failure, () => false);

const deletedPeer = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deletedPeer)
    .handleAction(actions.deletedPeer.request, () => initialState.deletedPeer)
    .handleAction(actions.deletedPeer.success, (store, action) => action.payload)
    .handleAction(actions.deletedPeer.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletePeer, (store, action) => action.payload)
    .handleAction(actions.resetDeletedPeer, () => initialState.deletedPeer)

const updateGroupsVisible = createReducer<boolean, ActionTypes>(initialState.setUpdateGroupsVisible)
    .handleAction(actions.setUpdateGroupsVisible, (store, action) => action.payload)

const savedGroups = createReducer<ChangeResponse<Group[] | null>, ActionTypes>(initialState.savedGroups)
    .handleAction(actions.saveGroups.request, () => initialState.savedGroups)
    .handleAction(actions.saveGroups.success, (store, action) => action.payload)
    .handleAction(actions.saveGroups.failure, (store, action) => action.payload)
    .handleAction(actions.resetSavedGroups, () => initialState.savedGroups)

const updatedPeer = createReducer<CreateResponse<Peer | null>, ActionTypes>(initialState.updatedPeer)
    .handleAction(actions.updatePeer.request, () => initialState.updatedPeer)
    .handleAction(actions.updatePeer.success, (store, action) => action.payload)
    .handleAction(actions.updatePeer.failure, (store, action) => action.payload)
    .handleAction(actions.setUpdatedPeer, (store, action) => action.payload)
    .handleAction(actions.resetUpdatedPeer, () => initialState.updatedPeer)

export default combineReducers({
  data,
  peer,
  loading,
  failed,
  saving,
  deletedPeer,
  updateGroupsVisible,
  savedGroups,
  updatedPeer
});
