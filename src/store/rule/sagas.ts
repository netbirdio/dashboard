import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, DeleteResponse} from '../../services/api-client/types';
import { Rule } from './types'
import service from './service';
import actions from './actions';

export function* getRules(action: ReturnType<typeof actions.getRules.request>): Generator {
  try {

    yield put(actions.setDeleteRule({
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

export function* setDeleteRule(action: ReturnType<typeof  actions.setDeleteRule>): Generator {
  yield put(actions.setDeleteRule(action.payload))
}

export function* deleteRule(action: ReturnType<typeof actions.deletedRule.request>): Generator {
  try {
    yield call(actions.setDeleteRule,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deletedRule, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deletedRule.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const rules = (yield select(state => state.rule.data)) as Rule[]
    yield put(actions.getRules.success(rules.filter((p:Rule) => p.ID !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deletedRule.failure({
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
    takeLatest(actions.deletedRule.request, deleteRule)
  ]);
}

