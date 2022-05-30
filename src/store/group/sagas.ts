import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import { Group } from './types'
import service from './service';
import actions from './actions';

export function* getGroups(action: ReturnType<typeof actions.getGroups.request>): Generator {
  try {

    yield put(actions.setDeleteGroup({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getGroups, action.payload);
    const response = effect as ApiResponse<Group[]>;

    yield put(actions.getGroups.success(response.body));
  } catch (err) {
    yield put(actions.getGroups.failure(err as ApiError));
  }
}

export function* setCreateGroup(action: ReturnType<typeof  actions.setCreateGroup>): Generator {
  yield put(actions.setCreateGroup(action.payload))
}

export function* createGroup(action: ReturnType<typeof actions.createGroup.request>): Generator {
  try {
    yield put(actions.setCreateGroup({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<Group | null>))

    const effect = yield call(service.createGroup, action.payload);
    const response = effect as ApiResponse<Group>;

    yield put(actions.createGroup.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<Group | null>));

    const setupKeys = [...(yield select(state => state.setupKey.data)) as Group[]]
    setupKeys.unshift(response.body)
    yield put(actions.getGroups.success(setupKeys));
  } catch (err) {
    yield put(actions.createGroup.failure({
      loading: false,
      success: false,
      failure: false,
      error: err as ApiError,
      data: null
    } as CreateResponse<Group | null>));
  }
}

export function* setDeleteGroup(action: ReturnType<typeof  actions.setDeleteGroup>): Generator {
  yield put(actions.setDeleteGroup(action.payload))
}

export function* deleteGroup(action: ReturnType<typeof actions.deleteGroup.request>): Generator {
  try {
    yield call(actions.setDeleteGroup,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deleteGroup, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deleteGroup.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const rules = (yield select(state => state.rule.data)) as Group[]
    yield put(actions.getGroups.success(rules.filter((p:Group) => p.ID !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deleteGroup.failure({
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
    takeLatest(actions.getGroups.request, getGroups),
    takeLatest(actions.createGroup.request, createGroup),
    takeLatest(actions.deleteGroup.request, deleteGroup)
  ]);
}

