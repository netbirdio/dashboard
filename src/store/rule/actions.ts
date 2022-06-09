import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {Rule, RuleToSave} from './types';
import {ApiError, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getRules: createAsyncAction(
      'GET_RULES_REQUEST',
      'GET_RULES_SUCCESS',
      'GET_RULES_FAILURE',
  )<RequestPayload<null>, Rule[], ApiError>(),

  saveRule: createAsyncAction(
      'SAVE_RULE_REQUEST',
      'SAVE_RULE_SUCCESS',
      'SAVE_RULE_FAILURE',
  )<RequestPayload<RuleToSave>, CreateResponse<Rule | null>, CreateResponse<Rule | null>>(),
  setSavedRule: createAction('SET_CREATE_RULE')<CreateResponse<Rule | null>>(),
  resetSavedRule: createAction('RESET_CREATE_RULE')<null>(),
  
  deleteRule: createAsyncAction(
      'DELETE_RULE_REQUEST',
      'DELETE_RULE_SUCCESS',
      'DELETE_RULE_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletedRule: createAction('SET_DELETED_RULE')<DeleteResponse<string | null>>(),
  resetDeletedRule: createAction('RESET_DELETED_RULE')<null>(),
  removeRule:  createAction('REMOVE_RULE')<string>(),

  setRule: createAction('SET_RULE')<Rule>(),
  setSetupNewRuleVisible: createAction('SET_SETUP_NEW_RULE_VISIBLE')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
