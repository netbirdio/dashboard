import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Peer } from './types';
import actions, { ActionTypes } from './actions';

type StateType = Readonly<{
  data: Peer[] | null;
  peer: Peer | null;
  loading: boolean;
  failed: boolean;
  saving: boolean;
}>;

const initialState: StateType = {
  data: [],
  peer: null,
  loading: false,
  failed: false,
  saving: false
};

const data = createReducer<Peer[], ActionTypes>(initialState.data as Peer[])
  .handleAction(actions.getPeers.success,(_, action) => action.payload)
  .handleAction(actions.getPeers.failure, () => []);

const peer = createReducer<Peer, ActionTypes>(initialState.peer as Peer)
    .handleAction(actions.setPeer, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getPeers.request, () => true)
    .handleAction(actions.getPeers.success, () => false)
    .handleAction(actions.getPeers.failure, () => false);

const failed = createReducer<boolean, ActionTypes>(initialState.failed)
    .handleAction(actions.getPeers.request, () => false)
    .handleAction(actions.getPeers.success, () => false)
    .handleAction(actions.getPeers.failure, () => true);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getPeers.request, () => true)
    .handleAction(actions.getPeers.success, () => false)
    .handleAction(actions.getPeers.failure, () => false);

export default combineReducers({
  data,
  peer,
  loading,
  failed,
  saving
});
