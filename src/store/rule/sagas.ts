import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';
import {Rule, RuleToSave} from './types'
import service from './service';
import serviceGroup from '../group/service';
import actions from './actions';
import { actions as groupActions } from '../group';
import {Group} from "../group/types";

export function* getRules(action: ReturnType<typeof actions.getRules.request>): Generator {
  try {

    yield put(actions.setDeletedRule({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getRules, action.payload);
    const response = effect as ApiResponse<Rule[]>;

    yield put(actions.getRules.success(response.body));
  } catch (err) {
    yield put(actions.getRules.failure(err as ApiError));
  }
}

export function* setCreatedRule(action: ReturnType<typeof  actions.setSavedRule>): Generator {
  yield put(actions.setSavedRule(action.payload))
}

function getNewGroupIds(dataString:string[], responses:Group[]):string[] {
  return responses.filter(r => dataString.includes(r.Name)).map(r => r.ID || '')
}

export function* saveRule(action: ReturnType<typeof actions.saveRule.request>): Generator {
  try {
    yield put(actions.setSavedRule({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<Rule | null>))

    const ruleToSave = action.payload.payload

    const responsesGroup = yield all(ruleToSave.groupsToSave.map(g => call(serviceGroup.createGroup, {
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: { Name: g }
      })
    ))


    const resGroups = (responsesGroup as ApiResponse<Rule>[]).filter(r => r.statusCode === 200).map(r => (r.body as Group))

    const currentGroups = [...(yield select(state => state.group.data)) as Rule[]]
    const newGroups = [...currentGroups, ...resGroups]
    yield put(groupActions.getGroups.success(newGroups));

    const newSources = getNewGroupIds(ruleToSave.sourcesNoId, resGroups)
    const newDestinations = getNewGroupIds(ruleToSave.destinationsNoId, resGroups)

    const payloadToSave = {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        Name: ruleToSave.Name,
        Description: ruleToSave.Description,
        Source: [...ruleToSave.Source as string[], ...newSources],
        Destination: [...ruleToSave.Destination as string[], ...newDestinations],
        Flow: ruleToSave.Flow,
        Disabled: ruleToSave.Disabled
      } as Rule
    }

    let effect
    if (!ruleToSave.ID) {
       effect = yield call(service.createRule, payloadToSave);
    } else {
      payloadToSave.payload.ID = ruleToSave.ID
      effect = yield call(service.editRule, payloadToSave);
    }

    const response = effect as ApiResponse<Rule>;

    yield put(actions.saveRule.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<Rule | null>));

    yield put(groupActions.getGroups.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
    yield put(actions.getRules.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
  } catch (err) {
    yield put(actions.saveRule.failure({
      loading: false,
      success: false,
      failure: true,
      error: err as ApiError,
      data: null
    } as CreateResponse<Rule | null>));
  }
}

export function* setDeleteRule(action: ReturnType<typeof  actions.setDeletedRule>): Generator {
  yield put(actions.setDeletedRule(action.payload))
}

export function* deleteRule(action: ReturnType<typeof actions.deleteRule.request>): Generator {
  try {
    yield call(actions.setDeletedRule,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deletedRule, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deleteRule.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const rules = (yield select(state => state.rule.data)) as Rule[]
    yield put(actions.getRules.success(rules.filter((p:Rule) => p.ID !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deleteRule.failure({
      loading: false,
      success: false,
      failure: false,
      error: err as ApiError,
      data: null
    } as DeleteResponse<string | null>));
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getRules.request, getRules),
    takeLatest(actions.saveRule.request, saveRule),
    takeLatest(actions.deleteRule.request, deleteRule)
  ]);
}

