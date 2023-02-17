import {all, call, put, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse} from '../../services/api-client/types';
import {Account} from './types'
import service from './service';
import actions from './actions';

export function* getAccounts(action: ReturnType<typeof actions.getAccounts.request>): Generator {
    try {
        const effect = yield call(service.getAccounts, action.payload);
        const response = effect as ApiResponse<Account[]>;

        yield put(actions.getAccounts.success(response.body));
    } catch (err) {
        yield put(actions.getAccounts.failure(err as ApiError));
    }
}

export default function* sagas(): Generator {
    yield all([
        takeLatest(actions.getAccounts.request, getAccounts),
    ]);
}

