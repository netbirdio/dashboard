import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';
import { Peer } from './types'
import service from './service';
import actions from './actions';

export function* getPeers(action: ReturnType<typeof actions.getPeers.request>): Generator {
  try {

    yield put(actions.setDeletePeer({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getPeers, action.payload);
    const response = effect as ApiResponse<Peer[]>;

    yield put(actions.getPeers.success(response.body));
  } catch (err) {
    yield put(actions.getPeers.failure(err as ApiError));
  }
}

export function* setDeletePeer(action: ReturnType<typeof  actions.setDeletePeer>): Generator {
  yield put(actions.setDeletePeer(action.payload))
}

export function* deletePeer(action: ReturnType<typeof actions.deletedPeer.request>): Generator {
  try {
    yield call(actions.setDeletePeer,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deletedPeer, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deletedPeer.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const peers = (yield select(state => state.peer.data)) as Peer[]
    yield put(actions.getPeers.success(peers.filter((p:Peer) => p.IP !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deletedPeer.failure({
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
    takeLatest(actions.getPeers.request, getPeers),
    takeLatest(actions.deletedPeer.request, deletePeer)
  ]);
}

