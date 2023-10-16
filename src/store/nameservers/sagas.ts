import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import {NameServerGroup} from './types'
import service from './service';
import actions from './actions';
import serviceGroup from "../group/service";
import {Group} from "../group/types";
import {actions as groupActions} from "../group";

export function* getNameServerGroups(action: ReturnType<typeof actions.getNameServerGroups.request>): Generator {
  try {

    yield put(actions.setDeletedNameServerGroup({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getNameServerGroups, action.payload);
    const response = effect as ApiResponse<NameServerGroup[]>;

    yield put(actions.getNameServerGroups.success(response.body));
  } catch (err) {
    yield put(actions.getNameServerGroups.failure(err as ApiError));
  }
}

export function* setCreatedNameServerGroup(action: ReturnType<typeof  actions.setSavedNameServerGroup>): Generator {
  yield put(actions.setSavedNameServerGroup(action.payload))
}

export function* saveNameServerGroup(action: ReturnType<typeof actions.saveNameServerGroup.request>): Generator {
  try {
    yield put(actions.setSavedNameServerGroup({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<NameServerGroup | null>))

    const nameserverGroupToSave = action.payload.payload

    let groupsToCreate = nameserverGroupToSave.groupsToCreate
    if (!groupsToCreate) {
      groupsToCreate = []
    }

    // first, create groups that were newly added by user
    const responsesGroup = yield all(groupsToCreate.map(g => call(serviceGroup.createGroup, {
          getAccessTokenSilently: action.payload.getAccessTokenSilently,
          payload: {name: g}
        })
    ))

    const resGroups = (responsesGroup as ApiResponse<Group>[]).filter(r => r.statusCode === 200).map(g => (g.body as Group)).map(g => g.id)
    const newGroups = [...nameserverGroupToSave.groups, ...resGroups]

    const payloadToSave = {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        id: nameserverGroupToSave.id,
        name: nameserverGroupToSave.name,
        description: nameserverGroupToSave.description,
        primary: nameserverGroupToSave.primary,
        domains: nameserverGroupToSave.domains,
        nameservers: nameserverGroupToSave.nameservers,
        groups: newGroups,
        enabled: nameserverGroupToSave.enabled,
        search_domains_enabled: nameserverGroupToSave.search_domains_enabled,
      } as NameServerGroup,
    };

    let effect
    if (!nameserverGroupToSave.id) {
       effect = yield call(service.createNameServerGroup, payloadToSave);
    } else {
      payloadToSave.payload.id = nameserverGroupToSave.id
      effect = yield call(service.editNameServerGroup, payloadToSave);
    }

    const response = effect as ApiResponse<NameServerGroup>;

    yield put(actions.saveNameServerGroup.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<NameServerGroup | null>));

    yield put(groupActions.getGroups.request({
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: null
    }));

    yield put(actions.getNameServerGroups.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));

  } catch (err) {
    yield put(groupActions.getGroups.request({
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: null
    }));
    yield put(actions.saveNameServerGroup.failure({
      loading: false,
      success: false,
      failure: true,
      error: err as ApiError,
      data: null
    } as CreateResponse<NameServerGroup | null>));
  }
}

export function* setDeleteNameServerGroup(action: ReturnType<typeof  actions.setDeletedNameServerGroup>): Generator {
  yield put(actions.setDeletedNameServerGroup(action.payload))
}

export function* deleteNameServerGroup(action: ReturnType<typeof actions.deleteNameServerGroup.request>): Generator {
  try {
    yield put(actions.setDeletedNameServerGroup({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
     }))

    const effect = yield call(service.deletedNameServerGroup, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deleteNameServerGroup.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const nameserverGroup = (yield select(state => state.nameserverGroup.data)) as NameServerGroup[]
    yield put(actions.getNameServerGroups.success(nameserverGroup.filter((p:NameServerGroup) => p.id !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deleteNameServerGroup.failure({
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
    takeLatest(actions.getNameServerGroups.request, getNameServerGroups),
    takeLatest(actions.saveNameServerGroup.request, saveNameServerGroup),
    takeLatest(actions.deleteNameServerGroup.request, deleteNameServerGroup)
  ]);
}

