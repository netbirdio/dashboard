import {ActionType, createAction, createAsyncAction} from 'typesafe-actions';
import {User, UserToSave} from './types';
import {ApiError, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getUsers: createAsyncAction(
      'GET_USERS_REQUEST',
      'GET_USERS_SUCCESS',
      'GET_USERS_FAILURE',
  )<RequestPayload<null>, User[], ApiError>(),

  getServiceUsers: createAsyncAction(
      'GET_SERVICE_USERS_REQUEST',
      'GET_SERVICE_USERS_SUCCESS',
      'GET_SERVICE_USERS_FAILURE',
  )<RequestPayload<null>, User[], ApiError>(),

  getRegularUsers: createAsyncAction(
      'GET_REGULAR_USERS_REQUEST',
      'GET_REGULAR_USERS_SUCCESS',
      'GET_REGULAR_USERS_FAILURE',
  )<RequestPayload<null>, User[], ApiError>(),

  deleteUser: createAsyncAction(
        'DELETE_USER_REQUEST',
       'DELETE_USER_SUCCESS',
         'DELETE_USER_FAILURE',
    )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletedUser: createAction('SET_DELETED_USER')<DeleteResponse<string | null>>(),
  resetDeletedUser: createAction('RESET_DELETED_USER')<null>(),

  // used to set a user object that was picked in the user table in the UserUpdate drawer (user update window on right-side).
  setUser: createAction('SET_USER')<User>(),
  // used to make the UserUpdate drawer visible in the UI.
  setUpdateUserDrawerVisible: createAction('SET_UPDATE_USER_VISIBLE')<boolean>(),
  // used to make the ViewUserPopup visible in the UI.
  setViewUserPopupVisible: createAction('SET_VIEW_USER_VISIBLE')<boolean>(),
  // used to make the EditUserPopup visible in the UI.
  setEditUserPopupVisible: createAction('SET_EDIT_USER_VISIBLE')<boolean>(),
  // used to make the AddServiceUserPopup visible in the UI.
  setAddServiceUserPopupVisible: createAction('SET_ADD_SERVICE_USER_VISIBLE')<boolean>(),

  saveUser: createAsyncAction(
      'SAVE_USER_REQUEST',
      'SAVE_USER_SUCCESS',
      'SAVE_USER_FAILURE',
  )<RequestPayload<UserToSave>, CreateResponse<User | null>, CreateResponse<User | null>>(),
  setSavedUser: createAction('SET_SAVED_USER')<CreateResponse<User | null>>(),
  resetSavedUser: createAction('RESET_SAVED_USER')<null>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
