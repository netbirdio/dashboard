import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import {SetupKey, SetupKeyToSave} from './types'
import service from './service';
import actions from './actions';
import serviceGroup from "../group/service";
import {Group} from "../group/types";
import {actions as groupActions} from "../group";

export function* getSetupKeys(action: ReturnType<typeof actions.getSetupKeys.request>): Generator {
    try {
        const effect = yield call(service.getSetupKeys, action.payload);
        const response = effect as ApiResponse<SetupKey[]>;

        yield put(actions.getSetupKeys.success(response.body.map(k => {
            // always set auto_groups even if absent (avoid null)
            if (k.auto_groups) {
                return k
            }
            return {...k, auto_groups: []}
        })));
    } catch (err) {
        yield put(actions.getSetupKeys.failure(err as ApiError));
    }
}

export function* setCreateSetupKey(action: ReturnType<typeof  actions.setSavedSetupKey>): Generator {
    yield put(actions.setSavedSetupKey(action.payload))
}

export function* saveSetupKey(action: ReturnType<typeof actions.saveSetupKey.request>): Generator {
    try {
        yield put(actions.setSavedSetupKey({
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        } as CreateResponse<SetupKey | null>))

        const keyToSave = action.payload.payload

        let groupsToCreate = keyToSave.groupsToCreate
        if (!groupsToCreate) {
            groupsToCreate = []
        }

        // first, create groups that were newly added by user
        const responsesGroup = yield all(groupsToCreate.map(g => call(serviceGroup.createGroup, {
                getAccessTokenSilently: action.payload.getAccessTokenSilently,
                payload: { name: g }
            })
        ))

        const resGroups = (responsesGroup as ApiResponse<Group>[]).filter(r => r.statusCode === 200).map(g => (g.body as Group)).map(g => g.id)
        const newGroups = [...keyToSave.auto_groups, ...resGroups]
        let effect
        if (!keyToSave.id) {
            effect = yield call(service.createSetupKey, {
                getAccessTokenSilently: action.payload.getAccessTokenSilently,
                payload: {
                    name: keyToSave.name,
                    auto_groups: newGroups,
                    type: keyToSave.type,
                    expires_in: keyToSave.expires_in,
                    usage_limit: keyToSave.usage_limit,
                    ephemeral: keyToSave.ephemeral
                } as SetupKeyToSave
            });
        } else {
            effect = yield call(service.editSetupKey, {
                getAccessTokenSilently: action.payload.getAccessTokenSilently,
                payload: {
                    id: keyToSave.id,
                    name: keyToSave.name,
                    revoked: keyToSave.revoked,
                    auto_groups: newGroups,
                    usage_limit: keyToSave.usage_limit
                } as SetupKeyToSave
            });
        }
        const response = effect as ApiResponse<SetupKey>;

        yield put(actions.saveSetupKey.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as CreateResponse<SetupKey | null>));

        yield put(groupActions.getGroups.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
        yield put(actions.getSetupKeys.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
    } catch (err) {
        yield put(actions.saveSetupKey.failure({
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

export default function* sagas(): Generator {
    yield all([
        takeLatest(actions.getSetupKeys.request, getSetupKeys),
        takeLatest(actions.saveSetupKey.request, saveSetupKey),
        takeLatest(actions.deleteSetupKey.request, deleteSetupKey)
    ]);
}

