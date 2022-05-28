import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import { Rule } from './types';
import {ApiError, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getRules: createAsyncAction(
      'GET_RULES_REQUEST',
      'GET_RULES_SUCCESS',
      'GET_RULES_FAILURE',
  )<RequestPayload<null>, Rule[], ApiError>(),
  deletedRule: createAsyncAction(
      'DELETE_RULE_REQUEST',
      'DELETE_RULE_SUCCESS',
      'DELETE_RULE_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeleteRule: createAction('SET_DELETE_RULE')<DeleteResponse<string | null>>(),
  removeRule:  createAction('REMOVE_RULE')<string>(),
  setRule: createAction('SET_RULE')<Rule>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
