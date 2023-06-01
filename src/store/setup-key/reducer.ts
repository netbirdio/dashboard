import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { SetupKey } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse, ChangeResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: SetupKey[] | null;
  setupKey: SetupKey | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  deletedSetupKey: DeleteResponse<string | null>;
  revokedSetupKey: ChangeResponse<SetupKey | null>;
  savedSetupKey: CreateResponse<SetupKey | null>;
  setupNewKeyVisible: boolean;
  setupEditKeyVisible: boolean;
}>;

const initialState: StateType = {
    data: [],
    setupKey: null,
    loading: false,
    failed: null,
    saving: false,
    deletedSetupKey: <DeleteResponse<string | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    revokedSetupKey: <ChangeResponse<SetupKey | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    savedSetupKey: <CreateResponse<SetupKey | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    setupNewKeyVisible: false,
    setupEditKeyVisible: false
};

const data = createReducer<SetupKey[], ActionTypes>(initialState.data as SetupKey[])
    .handleAction(actions.getSetupKeys.success,(_, action) => action.payload)
    .handleAction(actions.getSetupKeys.failure, () => []);

const setupKey = createReducer<SetupKey, ActionTypes>(initialState.setupKey as SetupKey)
    .handleAction(actions.setSetupKey, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getSetupKeys.request, () => true)
    .handleAction(actions.getSetupKeys.success, () => false)
    .handleAction(actions.getSetupKeys.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getSetupKeys.request, () => null)
    .handleAction(actions.getSetupKeys.success, () => null)
    .handleAction(actions.getSetupKeys.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getSetupKeys.request, () => true)
    .handleAction(actions.getSetupKeys.success, () => false)
    .handleAction(actions.getSetupKeys.failure, () => false);

const deletedSetupKey = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deletedSetupKey)
    .handleAction(actions.deleteSetupKey.request, () => initialState.deletedSetupKey)
    .handleAction(actions.deleteSetupKey.success, (store, action) => action.payload)
    .handleAction(actions.deleteSetupKey.failure, (store, action) => action.payload)
    .handleAction(actions.setDeleteSetupKey, (store, action) => action.payload)
    .handleAction(actions.resetDeletedSetupKey, (store, action) => initialState.deletedSetupKey);

const savedSetupKey = createReducer<CreateResponse<SetupKey | null>, ActionTypes>(initialState.savedSetupKey)
    .handleAction(actions.saveSetupKey.request, () => initialState.savedSetupKey)
    .handleAction(actions.saveSetupKey.success, (store, action) => action.payload)
    .handleAction(actions.saveSetupKey.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedSetupKey, (store, action) => action.payload)
    .handleAction(actions.resetSavedSetupKey, () => initialState.savedSetupKey)

const setupNewKeyVisible = createReducer<boolean, ActionTypes>(initialState.setupNewKeyVisible)
    .handleAction(actions.setSetupNewKeyVisible, (store, action) => action.payload)

    const setupEditKeyVisible = createReducer<boolean, ActionTypes>(initialState.setupEditKeyVisible)
    .handleAction(actions.setSetupEditKeyVisible, (store, action) => action.payload)

export default combineReducers({
  data,
  setupKey,
  loading,
  failed,
  saving,
  deletedSetupKey,
  savedSetupKey: savedSetupKey,
  setupNewKeyVisible,
  setupEditKeyVisible,
});
