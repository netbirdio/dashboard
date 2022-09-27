import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import {DNS} from './types'
import service from './service';
import actions from './actions';

export function* getDNS(action: ReturnType<typeof actions.getDNS.request>): Generator {
  try {

    yield put(actions.setDeletedDNS({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getDNS, action.payload);
    const response = effect as ApiResponse<DNS[]>;

    yield put(actions.getDNS.success(response.body));
  } catch (err) {
    yield put(actions.getDNS.failure(err as ApiError));
  }
}

export function* setCreatedDNS(action: ReturnType<typeof  actions.setSavedDNS>): Generator {
  yield put(actions.setSavedDNS(action.payload))
}

export function* saveDNS(action: ReturnType<typeof actions.saveDNS.request>): Generator {
  try {
    yield put(actions.setSavedDNS({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<DNS | null>))

    const dnsToSave = action.payload.payload

    const payloadToSave = {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        id: dnsToSave.id,
        name: dnsToSave.name,
        description: dnsToSave.description,
        nameservers: dnsToSave.nameservers
      } as DNS
    }

    let effect
    if (!dnsToSave.id) {
       effect = yield call(service.createDNS, payloadToSave);
    } else {
      payloadToSave.payload.id = dnsToSave.id
      effect = yield call(service.editDNS, payloadToSave);
    }

    const response = effect as ApiResponse<DNS>;

    yield put(actions.saveDNS.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<DNS | null>));

    yield put(actions.getDNS.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
  } catch (err) {
    yield put(actions.saveDNS.failure({
      loading: false,
      success: false,
      failure: true,
      error: err as ApiError,
      data: null
    } as CreateResponse<DNS | null>));
  }
}

export function* setDeleteDNS(action: ReturnType<typeof  actions.setDeletedDNS>): Generator {
  yield put(actions.setDeletedDNS(action.payload))
}

export function* deleteDNS(action: ReturnType<typeof actions.deleteDNS.request>): Generator {
  try {
    yield call(actions.setDeletedDNS,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deletedDNS, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deleteDNS.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const dns = (yield select(state => state.dns.data)) as DNS[]
    yield put(actions.getDNS.success(dns.filter((p:DNS) => p.id !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deleteDNS.failure({
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
    takeLatest(actions.getDNS.request, getDNS),
    takeLatest(actions.saveDNS.request, saveDNS),
    takeLatest(actions.deleteDNS.request, deleteDNS)
  ]);
}

