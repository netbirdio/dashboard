import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import { Group } from './types';
import {ApiError, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getGroups: createAsyncAction(
      'GET_GROUPS_REQUEST',
      'GET_GROUPS_SUCCESS',
      'GET_GROUPS_FAILURE',
  )<RequestPayload<null>, Group[], ApiError>(),

  createGroup: createAsyncAction(
      'CREATE_SETUP_KEY_REQUEST',
      'CREATE_SETUP_KEY_SUCCESS',
      'CREATE_SETUP_KEY_FAILURE',
  )<RequestPayload<Group>, CreateResponse<Group | null>, CreateResponse<Group | null>>(),
  setCreateGroup: createAction('SET_CREATE_SETUP_KEY')<CreateResponse<Group | null>>(),

  deleteGroup: createAsyncAction(
      'DELETE_GROUP_REQUEST',
      'DELETE_GROUP_SUCCESS',
      'DELETE_GROUP_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeleteGroup: createAction('SET_DELETE_GROUP')<DeleteResponse<string | null>>(),
  removeGroup:  createAction('REMOVE_GROUP')<string>(),
  setGroup: createAction('SET_GROUP')<Group>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
