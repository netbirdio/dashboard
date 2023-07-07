import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {NameServerGroup, NameServerGroupToSave} from './types';
import {ApiError, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getNameServerGroups: createAsyncAction(
      'GET_NameServerGroup_REQUEST',
      'GET_NameServerGroup_SUCCESS',
      'GET_NameServerGroup_FAILURE',
  )<RequestPayload<null>, NameServerGroup[], ApiError>(),

  saveNameServerGroup: createAsyncAction(
      'SAVE_NameServerGroup_REQUEST',
      'SAVE_NameServerGroup_SUCCESS',
      'SAVE_NameServerGroup_FAILURE',
  )<RequestPayload<NameServerGroupToSave>, CreateResponse<NameServerGroup | null>, CreateResponse<NameServerGroup | null>>(),
  setSavedNameServerGroup: createAction('SET_CREATE_NameServerGroup')<CreateResponse<NameServerGroup | null>>(),
  resetSavedNameServerGroup: createAction('RESET_CREATE_NameServerGroup')<null>(),
  
  deleteNameServerGroup: createAsyncAction(
      'DELETE_NameServerGroup_REQUEST',
      'DELETE_NameServerGroup_SUCCESS',
      'DELETE_NameServerGroup_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletedNameServerGroup: createAction('SET_DELETED_NameServerGroup')<DeleteResponse<string | null>>(),
  resetDeletedNameServerGroup: createAction('RESET_DELETED_NameServerGroup')<null>(),
  removeNameServerGroup:  createAction('REMOVE_NameServerGroup')<string>(),

  setNameServerGroup: createAction('SET_NameServerGroup')<NameServerGroup>(),
  setSetupNewNameServerGroupVisible: createAction('SET_SETUP_NEW_NameServerGroup_VISIBLE')<boolean>(),
  setSetupEditNameServerGroupVisible: createAction('SET_SETUP_EDIT_NameServerGroup_VISIBLE')<boolean>(),
  setSetupNewNameServerGroupHA: createAction('SET_SETUP_NEW_NameServerGroup_HA')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
