import {ActionType, createAction, createAsyncAction} from 'typesafe-actions';
import {Account} from './types';
import {ApiError, ChangeResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
    getAccounts: createAsyncAction(
        'GET_ACCOUNTS_REQUEST',
        'GET_ACCOUNTS_SUCCESS',
        'GET_ACCOUNTS_FAILURE',
    )<RequestPayload<null>, Account[], ApiError>(),

    updateAccount: createAsyncAction(
        'UPDATE_ACCOUNT',
        'UPDATE_ACCOUNT_SUCCESS',
        'UPDATE_ACCOUNT_FAILURE',
    )<RequestPayload<Account>, ChangeResponse<Account | null>, ChangeResponse<Account | null>>(),
    setUpdateAccount: createAction('SET_UPDATED_ACCOUNT')<ChangeResponse<Account | null>>(),
    resetUpdateAccount: createAction('RESET_UPDATED_ACCOUNT')<null>(),
    deleteAccount: createAsyncAction(
        'DELETE_ACCOUNT_REQUEST',
        'DELETE_ACCOUNT_SUCCESS',
        'DELETE_ACCOUNT_FAILURE'
    )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
    resetDeletedAccount: createAction('RESET_DELETED_ACCOUNT')<null>(),
    setDeleteAccount: createAction('SET_DELETE_ACCOUNT')<DeleteResponse<string | null>>(),
};


export type ActionTypes = ActionType<typeof actions>;
export default actions;
