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
    createdSetupKey: CreateResponse<SetupKey | null>;
    setupNewKeyVisible: boolean
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
    createdSetupKey: <CreateResponse<SetupKey | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    setupNewKeyVisible: false
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

const revokedSetupKey = createReducer<ChangeResponse<SetupKey | null>, ActionTypes>(initialState.revokedSetupKey)
    .handleAction(actions.revokeSetupKey.request, () => initialState.revokedSetupKey)
    .handleAction(actions.revokeSetupKey.success, (store, action) => action.payload)
    .handleAction(actions.revokeSetupKey.failure, (store, action) => action.payload)
    .handleAction(actions.setRevokeSetupKey, (store, action) => action.payload)
    .handleAction(actions.resetRevokedSetupKey, () => initialState.revokedSetupKey)

const createdSetupKey = createReducer<CreateResponse<SetupKey | null>, ActionTypes>(initialState.createdSetupKey)
    .handleAction(actions.saveSetupKey.request, () => initialState.createdSetupKey)
    .handleAction(actions.saveSetupKey.success, (store, action) => action.payload)
    .handleAction(actions.saveSetupKey.failure, (store, action) => action.payload)
    .handleAction(actions.setSaveSetupKey, (store, action) => action.payload)

const setupNewKeyVisible = createReducer<boolean, ActionTypes>(initialState.setupNewKeyVisible)
    .handleAction(actions.setSetupNewKeyVisible, (store, action) => action.payload)

export default combineReducers({
    data,
    setupKey,
    loading,
    failed,
    saving,
    deletedSetupKey,
    revokedSetupKey,
    createdSetupKey,
    setupNewKeyVisible
});
