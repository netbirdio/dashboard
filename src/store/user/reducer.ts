import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { User } from './types';
import actions, { ActionTypes } from './actions';
import { ApiError } from "../../services/api-client/types";

type StateType = Readonly<{
  data: User[] | null;
  loading: boolean;
  failed: ApiError | null;
}>;

const initialState: StateType = {
  data: [],
  loading: false,
  failed: null,
};

const data = createReducer<User[], ActionTypes>(initialState.data as User[])
  .handleAction(actions.getUsers.success,(_, action) => action.payload)
  .handleAction(actions.getUsers.failure, () => []);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getUsers.request, () => true)
    .handleAction(actions.getUsers.success, () => false)
    .handleAction(actions.getUsers.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getUsers.request, () => null)
    .handleAction(actions.getUsers.success, () => null)
    .handleAction(actions.getUsers.failure, (store, action) => action.payload);


export default combineReducers({
  data,
  loading,
  failed
});
