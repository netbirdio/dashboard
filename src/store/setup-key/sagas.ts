import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, ChangeResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import {SetupKey, SetupKeyRevoke} from './types'
import service from './service';
import actions from './actions';

export function* getSetupKeys(action: ReturnType<typeof actions.getSetupKeys.request>): Generator {
    try {
        const effect = yield call(service.getSetupKeys, action.payload);
        const response = effect as ApiResponse<SetupKey[]>;

        yield put(actions.getSetupKeys.success(response.body.sort((a: SetupKey, b: SetupKey) => b.name.localeCompare(a.name))));
    } catch (err) {
        yield put(actions.getSetupKeys.failure(err as ApiError));
    }
}

export function* setCreateSetupKey(action: ReturnType<typeof  actions.setCreateSetupKey>): Generator {
    yield put(actions.setCreateSetupKey(action.payload))
}

export function* createSetupKey(action: ReturnType<typeof actions.createSetupKey.request>): Generator {
    try {
        yield put(actions.setCreateSetupKey({
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        } as CreateResponse<SetupKey | null>))

        const effect = yield call(service.createSetupKey, action.payload);
        const response = effect as ApiResponse<SetupKey>;

        yield put(actions.createSetupKey.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as CreateResponse<SetupKey | null>));

        const setupKeys = [...(yield select(state => state.setupKey.data)) as SetupKey[]]
        setupKeys.unshift(response.body)
        yield put(actions.getSetupKeys.success(setupKeys));
    } catch (err) {
        yield put(actions.createSetupKey.failure({
            loading: false,
            success: false,
            failure: false,
            error: err as ApiError,
            data: null
        } as CreateResponse<SetupKey | null>));
    }
}

export function* setDeleteSetupKey(action: ReturnType<typeof  actions.setDeleteSetupKey>): Generator {
    yield put(actions.setDeleteSetupKey(action.payload))
}

export function* deleteSetupKey(action: ReturnType<typeof actions.deleteSetupKey.request>): Generator {
    try {
        yield call(actions.setDeleteSetupKey,{
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        } as DeleteResponse<string | null>)

        const effect = yield call(service.deleteSetupKey, action.payload);
        const response = effect as ApiResponse<any>;

        yield put(actions.deleteSetupKey.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as DeleteResponse<string | null>));

        const setupKeys = (yield select(state => state.setupKey.data)) as SetupKey[]
        yield put(actions.getSetupKeys.success(setupKeys.filter((p:SetupKey) => p.id !== action.payload.payload)))
    } catch (err) {
        yield put(actions.deleteSetupKey.failure({
            loading: false,
            success: false,
            failure: false,
            error: err as ApiError,
            data: null
        } as DeleteResponse<string | null>));
    }
}

export function* revokeSetupKey(action: ReturnType<typeof actions.revokeSetupKey.request>): Generator {
    try {
        yield put(actions.setRevokeSetupKey({
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        } as ChangeResponse<SetupKey | null>))

        const effect = yield call(service.revokeSetupKey, action.payload);
        const response = effect as ApiResponse<SetupKey>;

        yield put(actions.revokeSetupKey.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as ChangeResponse<SetupKey | null>));

        const setupKeys = [...(yield select(state => state.setupKey.data)) as SetupKey[]]
        let setupKey = setupKeys.find(s => s.id === response.body.id) as SetupKey
        if (setupKey) {
            setupKey.revoked = response.body.revoked
            setupKey.valid = response.body.valid
            setupKey.state = response.body.state
            setupKey.expires = response.body.expires
        }
        yield put(actions.getSetupKeys.success(setupKeys));
    } catch (err) {
        yield put(actions.createSetupKey.failure({
            loading: false,
            success: false,
            failure: false,
            error: err as ApiError,
            data: null
        } as CreateResponse<SetupKey | null>));
    }
}

export default function* sagas(): Generator {
    yield all([
        takeLatest(actions.getSetupKeys.request, getSetupKeys),
        takeLatest(actions.createSetupKey.request, createSetupKey),
        takeLatest(actions.deleteSetupKey.request, deleteSetupKey),
        takeLatest(actions.revokeSetupKey.request, revokeSetupKey)
    ]);
}

