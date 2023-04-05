import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import { Policy, PolicyToSave } from './types';
import { ApiError, CreateResponse, DeleteResponse, RequestPayload } from '../../services/api-client/types';

const actions = {
    getPolicies: createAsyncAction(
        'GET_POLICIES_REQUEST',
        'GET_POLICIES_SUCCESS',
        'GET_POLICIES_FAILURE',
    )<RequestPayload<null>, Policy[], ApiError>(),

    savePolicy: createAsyncAction(
        'SAVE_POLICY_REQUEST',
        'SAVE_POLICY_SUCCESS',
        'SAVE_POLICY_FAILURE',
    )<RequestPayload<PolicyToSave>, CreateResponse<Policy | null>, CreateResponse<Policy | null>>(),
    setSavedPolicy: createAction('SET_CREATE_POLICY')<CreateResponse<Policy | null>>(),
    resetSavedPolicy: createAction('RESET_CREATE_POLICY')<null>(),

    deletePolicy: createAsyncAction(
        'DELETE_POLICY_REQUEST',
        'DELETE_POLICY_SUCCESS',
        'DELETE_POLICY_FAILURE'
    )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
    setDeletedPolicy: createAction('SET_DELETED_POLICY')<DeleteResponse<string | null>>(),
    resetDeletedPolicy: createAction('RESET_DELETED_POLICY')<null>(),
    removePolicy: createAction('REMOVE_POLICY')<string>(),

    setPolicy: createAction('SET_POLICY')<Policy>(),
    setSetupNewPolicyVisible: createAction('SET_SETUP_NEW_POLICY_VISIBLE')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
