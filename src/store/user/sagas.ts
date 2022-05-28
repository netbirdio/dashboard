import {all, call, put, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse} from '../../services/api-client/types';
import { User } from './types'
import service from './service';
import actions from './actions';

export function* getPeers(action: ReturnType<typeof actions.getUsers.request>): Generator {
  try {
    const effect = yield call(service.getUsers, action.payload);
    const response = effect as ApiResponse<User[]>;

    yield put(actions.getUsers.success(response.body));
  } catch (err) {
    yield put(actions.getUsers.failure(err as ApiError));
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getUsers.request, getPeers)
  ]);
}

