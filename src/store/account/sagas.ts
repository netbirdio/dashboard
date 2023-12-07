import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, ChangeResponse, DeleteResponse} from '../../services/api-client/types';
import {Account} from './types'
import service from './service';
import actions from './actions';
import {deletePeer} from "../peer/sagas";

export function* getAccounts(action: ReturnType<typeof actions.getAccounts.request>): Generator {
    try {
        const effect = yield call(service.getAccounts, action.payload);
        const response = effect as ApiResponse<Account[]>;

        yield put(actions.getAccounts.success(response.body));
    } catch (err) {
        yield put(actions.getAccounts.failure(err as ApiError));
    }
}

export function* updateAccount(action: ReturnType<typeof actions.updateAccount.request>): Generator {
    try {
        yield put(actions.setUpdateAccount({
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null
        }))

        const account = action.payload.payload

        const payloadToSave = {
            getAccessTokenSilently: action.payload.getAccessTokenSilently,
            payload: account
        }

        const effect = yield call(service.updateAccount, payloadToSave)
        const response = effect as ApiResponse<Account>;

        yield put(actions.updateAccount.success({
            loading: false,
            success: true,
            failure: false,
            error: null,
            data: response.body
        } as ChangeResponse<Account | null>));

    } catch (err) {
        console.log(err)
        yield put(actions.updateAccount.failure({
            loading: false,
            success: false,
            failure: true,
            error: err as ApiError,
            data: null
        } as ChangeResponse<Account | null>));
    }
}

export function* deleteAccount(
    action: ReturnType<typeof actions.deleteAccount.request>
): Generator {
    try {
        yield call(actions.setDeleteAccount, {
            loading: true,
            success: false,
            failure: false,
            error: null,
            data: null,
        } as DeleteResponse<string | null>);

        const effect = yield call(service.deleteAccount, action.payload);
        const response = effect as ApiResponse<any>;

        yield put(
            actions.deleteAccount.success({
                loading: false,
                success: true,
                failure: false,
                error: null,
                data: response.body,
            } as DeleteResponse<string | null>)
        );

        const accounts = (yield select((state) => state.peer.data)) as Account[];
        yield put(
            actions.getAccounts.success(
                accounts.filter((p: Account) => p.id !== action.payload.payload)
            )
        );
    } catch (err) {
        yield put(
            actions.deleteAccount.failure({
                loading: false,
                success: false,
                failure: false,
                error: err as ApiError,
                data: null,
            } as DeleteResponse<string | null>)
        );
    }
}

export default function* sagas(): Generator {
    yield all([
        takeLatest(actions.getAccounts.request, getAccounts),
        takeLatest(actions.updateAccount.request, updateAccount),
        takeLatest(actions.deleteAccount.request, deleteAccount),
    ]);
}

