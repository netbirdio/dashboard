import {ActionType, createAction, createAsyncAction} from 'typesafe-actions';
import {Account} from './types';
import {ApiError, ChangeResponse, RequestPayload} from '../../services/api-client/types';

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
};


export type ActionTypes = ActionType<typeof actions>;
export default actions;
