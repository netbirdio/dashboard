import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Account } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: Account[] | null;
  loading: boolean;
  failed: ApiError | null;
}>;

const initialState: StateType = {
  data: [],
  loading: false,
  failed: null,
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


export default combineReducers({
  data,
  loading,
  failed,
});
