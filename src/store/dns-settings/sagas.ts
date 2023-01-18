import {all, call, put, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse} from '../../services/api-client/types';
import {DNSSettings} from './types'
import service from './service';
import actions from './actions';
import serviceGroup from "../group/service";
import {Group} from "../group/types";
import {actions as groupActions} from "../group";

export function* getDNSSettings(action: ReturnType<typeof actions.getDNSSettings.request>): Generator {
  try {

    const effect = yield call(service.getDNSSettings, action.payload);
    const response = effect as ApiResponse<DNSSettings>;

    yield put(actions.getDNSSettings.success(response.body));
  } catch (err) {
    yield put(actions.getDNSSettings.failure(err as ApiError));
  }
}

export function* saveDNSSettings(action: ReturnType<typeof actions.saveDNSSettings.request>): Generator {
  try {
    yield put(actions.setSavedDNSSettings({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<DNSSettings | null>))

    const settingsToSave = action.payload.payload

    let groupsToCreate = settingsToSave.groupsToCreate
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
    const newGroups = [...settingsToSave.disabled_management_groups, ...resGroups]

    const payloadToSave = {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        disabled_management_groups: newGroups,
      } as DNSSettings
    }

    let effect = yield call(service.editDNSSettings, payloadToSave);
    const response = effect as ApiResponse<DNSSettings>;

    yield put(actions.saveDNSSettings.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<DNSSettings | null>));

    yield put(groupActions.getGroups.request({
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: null
    }));

    yield put(actions.getDNSSettings.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));

  } catch (err) {
    yield put(groupActions.getGroups.request({
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: null
    }));
    yield put(actions.saveDNSSettings.failure({
      loading: false,
      success: false,
      failure: true,
      error: err as ApiError,
      data: null
    } as CreateResponse<DNSSettings | null>));
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getDNSSettings.request, getDNSSettings),
    takeLatest(actions.saveDNSSettings.request, saveDNSSettings),
  ]);
}

