import {ActionType, createAction, createAsyncAction} from 'typesafe-actions';
import { User } from './types';
import {ApiError, CreateResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getUsers: createAsyncAction(
      'GET_USERS_REQUEST',
      'GET_USERS_SUCCESS',
      'GET_USERS_FAILURE',
  )<RequestPayload<null>, User[], ApiError>(),

  // used to set a user object that was picked in the user table in the UserUpdate drawer (user update window on right-side).
  setUser: createAction('SET_USER')<User>(),
  // used to make the UserUpdate drawer visible in the UI.
  setUpdateUserDrawerVisible: createAction('SET_UPDATE_USER_VISIBLE')<boolean>(),

  saveUser: createAsyncAction(
      'SAVE_USER_REQUEST',
      'SAVE_USER_SUCCESS',
      'SAVE_USER_FAILURE',
  )<RequestPayload<User>, CreateResponse<User | null>, CreateResponse<User | null>>(),
  setSavedUser: createAction('SET_SAVED_USER')<CreateResponse<User | null>>(),
  resetSavedUser: createAction('RESET_SAVED_USER')<null>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
