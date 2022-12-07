import {all, call, put, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse} from '../../services/api-client/types';
import {Event} from './types'
import service from './service';
import actions from './actions';

export function* getEvents(action: ReturnType<typeof actions.getEvents.request>): Generator {
    try {
        const effect = yield call(service.getEvents, action.payload);
        const response = effect as ApiResponse<Event[]>;

        yield put(actions.getEvents.success(response.body));
    } catch (err) {
        yield put(actions.getEvents.failure(err as ApiError));
    }
}

export default function* sagas(): Generator {
    yield all([
        takeLatest(actions.getEvents.request, getEvents),
    ]);
}

