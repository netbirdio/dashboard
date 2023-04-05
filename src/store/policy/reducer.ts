import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Policy } from './types';
import actions, { ActionTypes } from './actions';
import { ApiError, DeleteResponse, CreateResponse } from "../../services/api-client/types";

type StateType = Readonly<{
    data: Policy[] | null;
    policy: Policy | null;
    loading: boolean;
    failed: ApiError | null;
    saving: boolean;
    deletePolicy: DeleteResponse<string | null>;
    savedPolicy: CreateResponse<Policy | null>;
    setupNewPolicyVisible: boolean
}>;

const initialState: StateType = {
    data: [],
    policy: null,
    loading: false,
    failed: null,
    saving: false,
    deletePolicy: <DeleteResponse<string | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data: null
    },
    savedPolicy: <CreateResponse<Policy | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data: null
    },
    setupNewPolicyVisible: false
};

const data = createReducer<Policy[], ActionTypes>(initialState.data as Policy[])
    .handleAction(actions.getPolicies.success, (_, action) => action.payload)
    .handleAction(actions.getPolicies.failure, () => []);

const rule = createReducer<Policy, ActionTypes>(initialState.policy as Policy)
    .handleAction(actions.setPolicy, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getPolicies.request, () => true)
    .handleAction(actions.getPolicies.success, () => false)
    .handleAction(actions.getPolicies.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getPolicies.request, () => null)
    .handleAction(actions.getPolicies.success, () => null)
    .handleAction(actions.getPolicies.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getPolicies.request, () => true)
    .handleAction(actions.getPolicies.success, () => false)
    .handleAction(actions.getPolicies.failure, () => false);

const deletedPolicy = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deletePolicy)
    .handleAction(actions.deletePolicy.request, () => initialState.deletePolicy)
    .handleAction(actions.deletePolicy.success, (store, action) => action.payload)
    .handleAction(actions.deletePolicy.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletedPolicy, (store, action) => action.payload)
    .handleAction(actions.resetDeletedPolicy, () => initialState.deletePolicy)

const savedPolicy = createReducer<CreateResponse<Policy | null>, ActionTypes>(initialState.savedPolicy)
    .handleAction(actions.savePolicy.request, () => initialState.savedPolicy)
    .handleAction(actions.savePolicy.success, (store, action) => action.payload)
    .handleAction(actions.savePolicy.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedPolicy, (store, action) => action.payload)
    .handleAction(actions.resetSavedPolicy, () => initialState.savedPolicy)

const setupNewPolicyVisible = createReducer<boolean, ActionTypes>(initialState.setupNewPolicyVisible)
    .handleAction(actions.setSetupNewPolicyVisible, (store, action) => action.payload)

export default combineReducers({
    data,
    rule,
    loading,
    failed,
    saving,
    deletedPolicy,
    savedPolicy,
    setupNewPolicyVisible
});
