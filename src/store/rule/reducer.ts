import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Rule } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: Rule[] | null;
  rule: Rule | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  deleteRule: DeleteResponse<string | null>;
  savedRule: CreateResponse<Rule | null>;
  setupNewRuleVisible: boolean
}>;

const initialState: StateType = {
  data: [],
  rule: null,
  loading: false,
  failed: null,
  saving: false,
  deleteRule: <DeleteResponse<string | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  savedRule: <CreateResponse<Rule | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  setupNewRuleVisible: false
};

const data = createReducer<Rule[], ActionTypes>(initialState.data as Rule[])
    .handleAction(actions.getRules.success,(_, action) => action.payload)
    .handleAction(actions.getRules.failure, () => []);

const rule = createReducer<Rule, ActionTypes>(initialState.rule as Rule)
    .handleAction(actions.setRule, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getRules.request, () => true)
    .handleAction(actions.getRules.success, () => false)
    .handleAction(actions.getRules.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getRules.request, () => null)
    .handleAction(actions.getRules.success, () => null)
    .handleAction(actions.getRules.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getRules.request, () => true)
    .handleAction(actions.getRules.success, () => false)
    .handleAction(actions.getRules.failure, () => false);

const deletedRule = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deleteRule)
    .handleAction(actions.deleteRule.request, () => initialState.deleteRule)
    .handleAction(actions.deleteRule.success, (store, action) => action.payload)
    .handleAction(actions.deleteRule.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletedRule, (store, action) => action.payload)
    .handleAction(actions.resetDeletedRule, () => initialState.deleteRule)

const savedRule = createReducer<CreateResponse<Rule | null>, ActionTypes>(initialState.savedRule)
    .handleAction(actions.saveRule.request, () => initialState.savedRule)
    .handleAction(actions.saveRule.success, (store, action) => action.payload)
    .handleAction(actions.saveRule.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedRule, (store, action) => action.payload)
    .handleAction(actions.resetSavedRule, () => initialState.savedRule)

const setupNewRuleVisible = createReducer<boolean, ActionTypes>(initialState.setupNewRuleVisible)
    .handleAction(actions.setSetupNewRuleVisible, (store, action) => action.payload)

export default combineReducers({
  data,
  rule,
  loading,
  failed,
  saving,
  deletedRule,
  savedRule,
  setupNewRuleVisible
});
