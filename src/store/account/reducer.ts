import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Account } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, ChangeResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: Account[] | null;
  loading: boolean;
  failed: ApiError | null;
  savedAccount: ChangeResponse<Account | null>;
}>;

const initialState: StateType = {
  data: [],
  loading: false,
  failed: null,
  savedAccount: <ChangeResponse<Account | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
};

const data = createReducer<Account[], ActionTypes>(initialState.data as Account[])
  .handleAction(actions.getAccounts.success,(_, action) => action.payload)
  .handleAction(actions.getAccounts.failure, () => []);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getAccounts.request, () => true)
    .handleAction(actions.getAccounts.success, () => false)
    .handleAction(actions.getAccounts.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getAccounts.request, () => null)
    .handleAction(actions.getAccounts.success, () => null)
    .handleAction(actions.getAccounts.failure, (store, action) => action.payload);

const updatedAccount = createReducer<ChangeResponse<Account | null>, ActionTypes>(initialState.savedAccount)
    .handleAction(actions.updateAccount.request, () => initialState.savedAccount)
    .handleAction(actions.updateAccount.success, (store, action) => action.payload)
    .handleAction(actions.updateAccount.failure, (store, action) => action.payload)
    .handleAction(actions.setUpdateAccount, (store, action) => action.payload)
    .handleAction(actions.resetUpdateAccount, () => initialState.savedAccount)


export default combineReducers({
  data,
  loading,
  failed,
  updatedAccount
});
