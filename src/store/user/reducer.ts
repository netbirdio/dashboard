import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { User } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, CreateResponse, DeleteResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: User[] | null;
  serviceUsers: User[] | null;
  regularUsers: User[] | null;
  loading: boolean;
  failed: ApiError | null;
  user: User | null;
  deletedUser: DeleteResponse<string | null>;
  savedUser: CreateResponse<User | null>;
  updateUserDrawerVisible: boolean
  editUserPopupVisible: boolean
  inviteUserPopupVisible: boolean
  addServiceUserPopupVisible: boolean
  usersTabOpen: string
}>;

const initialState: StateType = {
  data: [],
  serviceUsers: [],
  regularUsers: [],
  loading: false,
  failed: null,
  user: null,
  deletedUser: <DeleteResponse<string | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  // right-sided user update drawer
  updateUserDrawerVisible: false,
  editUserPopupVisible: false,
  inviteUserPopupVisible: false,
  addServiceUserPopupVisible: false,
  usersTabOpen: 'Users',
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

const serviceUsers = createReducer<User[], ActionTypes>(initialState.serviceUsers as User[])
    .handleAction(actions.getServiceUsers.success,(_, action) => action.payload)
    .handleAction(actions.getServiceUsers.failure, () => []);

const regularUsers = createReducer<User[], ActionTypes>(initialState.regularUsers as User[])
    .handleAction(actions.getRegularUsers.success,(_, action) => action.payload)
    .handleAction(actions.getRegularUsers.failure, () => []);

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

const deletedUser = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deletedUser)
    .handleAction(actions.deleteUser.request, () => initialState.deletedUser)
    .handleAction(actions.deleteUser.success, (store, action) => action.payload)
    .handleAction(actions.deleteUser.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletedUser, (store, action) => action.payload)
    .handleAction(actions.resetDeletedUser, (store, action) => initialState.deletedUser);

const updateUserDrawerVisible = createReducer<boolean, ActionTypes>(initialState.updateUserDrawerVisible)
    .handleAction(actions.setUpdateUserDrawerVisible, (store, action) => action.payload);

const inviteUserPopupVisible = createReducer<boolean, ActionTypes>(initialState.inviteUserPopupVisible)
    .handleAction(actions.setInviteUserPopupVisible, (store, action) => action.payload);

const editUserPopupVisible = createReducer<boolean, ActionTypes>(initialState.editUserPopupVisible)
    .handleAction(actions.setEditUserPopupVisible, (store, action) => action.payload);

const addServiceUserPopupVisible = createReducer<boolean, ActionTypes>(initialState.addServiceUserPopupVisible)
    .handleAction(actions.setAddServiceUserPopupVisible, (store, action) => action.payload);

const userTabOpen = createReducer<string, ActionTypes>(initialState.usersTabOpen)
    .handleAction(actions.setUserTabOpen, (store, action) => action.payload);

const savedUser = createReducer<CreateResponse<User | null>, ActionTypes>(initialState.savedUser)
    .handleAction(actions.saveUser.request, () => initialState.savedUser)
    .handleAction(actions.saveUser.success, (store, action) => action.payload)
    .handleAction(actions.saveUser.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedUser, (store, action) => action.payload)
    .handleAction(actions.resetSavedUser, () => initialState.savedUser)

export default combineReducers({
  data,
  serviceUsers,
  regularUsers,
  loading,
  failed,
  user,
  savedUser,
  deletedUser,
  updateUserDrawerVisible,
  inviteUserPopupVisible,
  editUserPopupVisible,
  addServiceUserPopupVisible,
  userTabOpen
});
