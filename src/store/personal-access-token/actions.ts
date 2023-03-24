import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {PersonalAccessToken, PersonalAccessTokenCreate, PersonalAccessTokenGenerated, SpecificPAT} from './types';
import {
  ApiError,
  CreateResponse,
  DeleteResponse,
  RequestPayload
} from '../../services/api-client/types';

const actions = {
  getPersonalAccessTokens: createAsyncAction(
      'GET_PERSONAL_ACCESS_TOKEN_REQUEST',
      'GET_PERSONAL_ACCESS_TOKEN_SUCCESS',
      'GET_PERSONAL_ACCESS_TOKEN_FAILURE',
  )<RequestPayload<string>, PersonalAccessToken[], ApiError>(),

  savePersonalAccessToken: createAsyncAction(
      'SAVE_PERSONAL_ACCESS_TOKEN_REQUEST',
      'SAVE_PERSONAL_ACCESS_TOKEN_SUCCESS',
      'SAVE_PERSONAL_ACCESS_TOKEN_FAILURE',
  )<RequestPayload<PersonalAccessTokenCreate>, CreateResponse<PersonalAccessTokenGenerated | null>, CreateResponse<PersonalAccessTokenGenerated | null>>(),
  setSavedPersonalAccessToken: createAction('SET_PERSONAL_ACCESS_TOKEN_KEY')<CreateResponse<PersonalAccessTokenGenerated | null>>(),
  resetSavedPersonalAccessToken: createAction('RESET_PERSONAL_ACCESS_TOKEN_KEY')<null>(),

  deletePersonalAccessToken: createAsyncAction(
      'DELETE_PERSONAL_ACCESS_TOKEN_REQUEST',
      'DELETE_PERSONAL_ACCESS_TOKEN_SUCCESS',
      'DELETE_PERSONAL_ACCESS_TOKEN_FAILURE'
  )<RequestPayload<SpecificPAT>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletePersonalAccessToken: createAction('SET_DELETE_PERSONAL_ACCESS_TOKEN')<DeleteResponse<string | null>>(),
  resetDeletedPersonalAccessToken: createAction('RESET_DELETE_PERSONAL_ACCESS_TOKEN')<null>(),

  removePersonalAccessToken:  createAction('REMOVE_PERSONAL_ACCESS_TOKEN')<string>(),
  setPersonalAccessToken: createAction('SET_SETUP_KEY')<PersonalAccessTokenCreate>(),
  setNewPersonalAccessTokenVisible: createAction('SET_NEW_PERSONAL_ACCESS_TOKEN_VISIBLE')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
