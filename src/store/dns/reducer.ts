import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { DNS } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: DNS[] | null;
  dns: DNS | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  deleteDNS: DeleteResponse<string | null>;
  savedDNS: CreateResponse<DNS | null>;
  setupNewDNSVisible: boolean;
  setupNewDNSHA: boolean
}>;

const initialState: StateType = {
  data: [],
  dns: null,
  loading: false,
  failed: null,
  saving: false,
  deleteDNS: <DeleteResponse<string | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  savedDNS: <CreateResponse<DNS | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  setupNewDNSVisible: false,
  setupNewDNSHA: false
};

const data = createReducer<DNS[], ActionTypes>(initialState.data as DNS[])
    .handleAction(actions.getDNS.success,(_, action) => action.payload)
    .handleAction(actions.getDNS.failure, () => []);

const dns = createReducer<DNS, ActionTypes>(initialState.dns as DNS)
    .handleAction(actions.setDNS, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getDNS.request, () => true)
    .handleAction(actions.getDNS.success, () => false)
    .handleAction(actions.getDNS.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getDNS.request, () => null)
    .handleAction(actions.getDNS.success, () => null)
    .handleAction(actions.getDNS.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getDNS.request, () => true)
    .handleAction(actions.getDNS.success, () => false)
    .handleAction(actions.getDNS.failure, () => false);

const deletedDNS = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deleteDNS)
    .handleAction(actions.deleteDNS.request, () => initialState.deleteDNS)
    .handleAction(actions.deleteDNS.success, (store, action) => action.payload)
    .handleAction(actions.deleteDNS.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletedDNS, (store, action) => action.payload)
    .handleAction(actions.resetDeletedDNS, () => initialState.deleteDNS)

const savedDNS = createReducer<CreateResponse<DNS | null>, ActionTypes>(initialState.savedDNS)
    .handleAction(actions.saveDNS.request, () => initialState.savedDNS)
    .handleAction(actions.saveDNS.success, (store, action) => action.payload)
    .handleAction(actions.saveDNS.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedDNS, (store, action) => action.payload)
    .handleAction(actions.resetSavedDNS, () => initialState.savedDNS)

const setupNewDNSVisible = createReducer<boolean, ActionTypes>(initialState.setupNewDNSVisible)
    .handleAction(actions.setSetupNewDNSVisible, (store, action) => action.payload)

const setupNewDNSHA = createReducer<boolean, ActionTypes>(initialState.setupNewDNSHA)
    .handleAction(actions.setSetupNewDNSHA, (store, action) => action.payload)

export default combineReducers({
  data,
  dns,
  loading,
  failed,
  saving,
  deletedDNS,
  savedDNS,
  setupNewDNSVisible,
  setupNewDNSHA
});
