import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {DNS} from './types';
import {ApiError, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getDNS: createAsyncAction(
      'GET_DNS_REQUEST',
      'GET_DNS_SUCCESS',
      'GET_DNS_FAILURE',
  )<RequestPayload<null>, DNS[], ApiError>(),

  saveDNS: createAsyncAction(
      'SAVE_DNS_REQUEST',
      'SAVE_DNS_SUCCESS',
      'SAVE_DNS_FAILURE',
  )<RequestPayload<DNS>, CreateResponse<DNS | null>, CreateResponse<DNS | null>>(),
  setSavedDNS: createAction('SET_CREATE_DNS')<CreateResponse<DNS | null>>(),
  resetSavedDNS: createAction('RESET_CREATE_DNS')<null>(),
  
  deleteDNS: createAsyncAction(
      'DELETE_DNS_REQUEST',
      'DELETE_DNS_SUCCESS',
      'DELETE_DNS_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletedDNS: createAction('SET_DELETED_DNS')<DeleteResponse<string | null>>(),
  resetDeletedDNS: createAction('RESET_DELETED_DNS')<null>(),
  removeDNS:  createAction('REMOVE_DNS')<string>(),

  setDNS: createAction('SET_DNS')<DNS>(),
  setSetupNewDNSVisible: createAction('SET_SETUP_NEW_DNS_VISIBLE')<boolean>(),
  setSetupNewDNSHA: createAction('SET_SETUP_NEW_DNS_HA')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
