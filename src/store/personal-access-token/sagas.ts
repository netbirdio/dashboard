import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import {PersonalAccessToken, PersonalAccessTokenCreate, PersonalAccessTokenGenerated} from './types'
import service from './service';
import actions from './actions';

export function* getPersonalAccessTokens(action: ReturnType<typeof actions.getPersonalAccessTokens.request>): Generator {
    try {
        const effect = yield call(service.getAllPersonalAccessTokens, action.payload);
        const response = effect as ApiResponse<PersonalAccessToken[]>;

        yield put(actions.getPersonalAccessTokens.success(response.body));
    } catch (err) {
        yield put(actions.getPersonalAccessTokens.failure(err as ApiError));
    }
}

export function* savePersonalAccessToken(action: ReturnType<typeof actions.savePersonalAccessToken.request>): Generator {
    try {
        yield put(actions.setSavedPersonalAccessToken({
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        } as CreateResponse<PersonalAccessTokenGenerated | null>))

        const tokenToSave = action.payload.payload

        let effect = yield call(service.createPersonalAccessToken, {
                getAccessTokenSilently: action.payload.getAccessTokenSilently,
                payload: {
                    user_id: tokenToSave.user_id,
                    name: tokenToSave.name,
                    expires_in: tokenToSave.expires_in,
                } as PersonalAccessTokenCreate
            });
        const response = effect as ApiResponse<PersonalAccessTokenGenerated>;

        yield put(actions.savePersonalAccessToken.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as CreateResponse<PersonalAccessTokenGenerated | null>));

        yield put(actions.getPersonalAccessTokens.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: tokenToSave.user_id }));
    } catch (err) {
        yield put(actions.savePersonalAccessToken.failure({
            loading: false,
            success: false,
            failure: false,
            error: err as ApiError,
            data: null
        } as CreateResponse<PersonalAccessTokenGenerated | null>));
    }
}

export function* deletePersonalAccessToken(action: ReturnType<typeof actions.deletePersonalAccessToken.request>): Generator {
    try {
        yield call(actions.setDeletePersonalAccessToken,{
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        } as DeleteResponse<string | null>)

        const effect = yield call(service.deletePersonalAccessToken, action.payload);
        const response = effect as ApiResponse<any>;

        yield put(actions.deletePersonalAccessToken.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as DeleteResponse<string | null>));

        const personalAccessTokens = (yield select(state => state.personalAccessToken.data)) as PersonalAccessToken[]
        yield put(actions.getPersonalAccessTokens.success(personalAccessTokens.filter((p:PersonalAccessToken) => p.id !== action.payload.payload.id)))
    } catch (err) {
        yield put(actions.deletePersonalAccessToken.failure({
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
        takeLatest(actions.getPersonalAccessTokens.request, getPersonalAccessTokens),
        takeLatest(actions.savePersonalAccessToken.request, savePersonalAccessToken),
        takeLatest(actions.deletePersonalAccessToken.request, deletePersonalAccessToken)
    ]);
}

