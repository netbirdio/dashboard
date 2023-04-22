import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse, ChangeResponse} from "../../services/api-client/types";
import {PersonalAccessToken, PersonalAccessTokenCreate, PersonalAccessTokenGenerated} from "./types";

type StateType = Readonly<{
    data: PersonalAccessToken[] | null;
    personalAccessToken: PersonalAccessTokenCreate | null;
    loading: boolean;
    failed: ApiError | null;
    saving: boolean;
    deletedPersonalAccessToken: DeleteResponse<string | null>;
    revokedPersonalAccessToken: ChangeResponse<string | null>;
    savedPersonalAccessToken: CreateResponse<PersonalAccessTokenGenerated | null>;
    newPersonalAccessTokenVisible: boolean
    newPersonalAccessTokenPopupVisible: boolean
}>;

const initialState: StateType = {
    data: [],
    personalAccessToken: null,
    loading: false,
    failed: null,
    saving: false,
    deletedPersonalAccessToken: <DeleteResponse<string | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    revokedPersonalAccessToken: <ChangeResponse<string | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    savedPersonalAccessToken: <CreateResponse<PersonalAccessTokenGenerated | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    newPersonalAccessTokenVisible: false,
    newPersonalAccessTokenPopupVisible: false
};

const data = createReducer<PersonalAccessToken[], ActionTypes>(initialState.data as PersonalAccessToken[])
    .handleAction(actions.getPersonalAccessTokens.success,(_, action) => action.payload)
    .handleAction(actions.getPersonalAccessTokens.failure, () => [])
    .handleAction(actions.resetPersonalAccessTokens, () => []);

const personalAccessToken = createReducer<PersonalAccessTokenCreate, ActionTypes>(initialState.personalAccessToken as PersonalAccessTokenCreate)
    .handleAction(actions.setPersonalAccessToken, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getPersonalAccessTokens.request, () => true)
    .handleAction(actions.getPersonalAccessTokens.success, () => false)
    .handleAction(actions.getPersonalAccessTokens.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getPersonalAccessTokens.request, () => null)
    .handleAction(actions.getPersonalAccessTokens.success, () => null)
    .handleAction(actions.getPersonalAccessTokens.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getPersonalAccessTokens.request, () => true)
    .handleAction(actions.getPersonalAccessTokens.success, () => false)
    .handleAction(actions.getPersonalAccessTokens.failure, () => false);

const deletedPersonalAccessToken = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deletedPersonalAccessToken)
    .handleAction(actions.deletePersonalAccessToken.request, () => initialState.deletedPersonalAccessToken)
    .handleAction(actions.deletePersonalAccessToken.success, (store, action) => action.payload)
    .handleAction(actions.deletePersonalAccessToken.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletePersonalAccessToken, (store, action) => action.payload)
    .handleAction(actions.resetDeletedPersonalAccessToken, (store, action) => initialState.deletedPersonalAccessToken);

const savedPersonalAccessToken = createReducer<CreateResponse<PersonalAccessTokenGenerated | null>, ActionTypes>(initialState.savedPersonalAccessToken)
    .handleAction(actions.savePersonalAccessToken.request, () => initialState.savedPersonalAccessToken)
    .handleAction(actions.savePersonalAccessToken.success, (store, action) => action.payload)
    .handleAction(actions.savePersonalAccessToken.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedPersonalAccessToken, (store, action) => action.payload)
    .handleAction(actions.resetSavedPersonalAccessToken, () => initialState.savedPersonalAccessToken)

const newPersonalAccessTokenVisible = createReducer<boolean, ActionTypes>(initialState.newPersonalAccessTokenVisible)
    .handleAction(actions.setNewPersonalAccessTokenVisible, (store, action) => action.payload)

const newPersonalAccessTokenPopupVisible = createReducer<boolean, ActionTypes>(initialState.newPersonalAccessTokenPopupVisible)
    .handleAction(actions.setNewPersonalAccessTokenPopupVisible, (store, action) => action.payload)

export default combineReducers({
    data,
    personalAccessToken: personalAccessToken,
    loading,
    failed,
    saving,
    deletedPersonalAccessToken: deletedPersonalAccessToken,
    savedPersonalAccessToken: savedPersonalAccessToken,
    newPersonalAccessTokenVisible: newPersonalAccessTokenVisible,
    newPersonalAccessTokenPopupVisible: newPersonalAccessTokenPopupVisible
});
