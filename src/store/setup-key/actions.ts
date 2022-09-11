import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {SetupKey, SetupKeyRevoke} from './types';
import {
  ApiError,
  ChangeResponse,
  CreateResponse,
  DeleteResponse,
  RequestPayload
} from '../../services/api-client/types';

const actions = {
  getSetupKeys: createAsyncAction(
      'GET_SETUP_KEYS_REQUEST',
      'GET_SETUP_KEYS_SUCCESS',
      'GET_SETUP_KEYS_FAILURE',
  )<RequestPayload<null>, SetupKey[], ApiError>(),

  saveSetupKey: createAsyncAction(
      'SAVE_SETUP_KEY_REQUEST',
      'SAVE_SETUP_KEY_SUCCESS',
      'SAVE_SETUP_KEY_FAILURE',
  )<RequestPayload<SetupKey>, CreateResponse<SetupKey | null>, CreateResponse<SetupKey | null>>(),
  setSavedSetupKey: createAction('SET_SAVE_SETUP_KEY')<CreateResponse<SetupKey | null>>(),
  resetSavedSetupKey: createAction('RESET_SAVE_SETUP_KEY')<null>(),

  deleteSetupKey: createAsyncAction(
      'DELETE_SETUP_KEY_REQUEST',
      'DELETE_SETUP_KEY_SUCCESS',
      'DELETE_SETUP_KEY_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeleteSetupKey: createAction('SET_DELETE_SETUP_KEY')<DeleteResponse<string | null>>(),
  resetDeletedSetupKey: createAction('RESET_DELETE_SETUP_KEY')<null>(),

  revokeSetupKey: createAsyncAction(
      'REVOKE_SETUP_KEY_REQUEST',
      'REVOKE_SETUP_KEY_SUCCESS',
      'REVOKE_SETUP_KEY_FAILURE'
  )<RequestPayload<SetupKeyRevoke>, ChangeResponse<SetupKey | null>, ChangeResponse<SetupKey | null>>(),
  setRevokeSetupKey: createAction('SET_REVOKED_SETUP_KEY')<ChangeResponse<SetupKey | null>>(),
  resetRevokedSetupKey: createAction('RESET_REVOKED_SETUP_KEY')<null>(),


  removeSetupKey:  createAction('REMOVE_SETUP_KEY')<string>(),
  setSetupKey: createAction('SET_SETUP_KEY')<SetupKey>(),
  setSetupNewKeyVisible: createAction('SET_SETUP_NEW_KEY_VISIBLE')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
