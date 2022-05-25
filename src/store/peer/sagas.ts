import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiResponse, RequestPayload} from '../../services/api-client/types';
import { Peer } from './types'
import service from './service';
import actions from './actions';

export function* getPeers(action: ReturnType<typeof actions.getPeers.request>): Generator {
  try {

    const effect = yield call(service.getPeers, action.payload);
    const response = effect as ApiResponse<Peer[]>;

    yield put(actions.getPeers.success(response.body));
  } catch (err) {
    yield put(actions.getPeers.failure(err as Error));
  }
}

export default function* sagas(): Generator {
  yield all([takeLatest(actions.getPeers.request, getPeers)]);
}

