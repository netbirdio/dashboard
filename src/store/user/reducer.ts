import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { User } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: User[] | null;
  loading: boolean;
  failed: ApiError | null;
  user: User | null;
  savedUser: CreateResponse<User | null>;
  updateUserDrawerVisible: boolean
}>;

const initialState: StateType = {
  data: [],
  loading: false,
  failed: null,
  user: null,
  // right-sided user update drawer
  updateUserDrawerVisible: false,
  savedUser: <CreateResponse<User | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
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

const user = createReducer<User, ActionTypes>(initialState.user as User)
    .handleAction(actions.setUser, (store, action) => action.payload);
const updateUserDrawerVisible = createReducer<boolean, ActionTypes>(initialState.updateUserDrawerVisible)
    .handleAction(actions.setUpdateUserDrawerVisible, (store, action) => action.payload);

const savedUser = createReducer<CreateResponse<User | null>, ActionTypes>(initialState.savedUser)
    .handleAction(actions.saveUser.request, () => initialState.savedUser)
    .handleAction(actions.saveUser.success, (store, action) => action.payload)
    .handleAction(actions.saveUser.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedUser, (store, action) => action.payload)
    .handleAction(actions.resetSavedUser, () => initialState.savedUser)

export default combineReducers({
  data,
  loading,
  failed,
  user,
  savedUser,
  updateUserDrawerVisible
});
