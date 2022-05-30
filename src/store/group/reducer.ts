import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Group } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse, ChangeResponse} from "../../services/api-client/types";

type StateType = Readonly<{
    data: Group[] | null;
    group: Group | null;
    loading: boolean;
    failed: ApiError | null;
    saving: boolean;
    deletedGroup: DeleteResponse<string | null>;
    revokedGroup: ChangeResponse<Group | null>;
    createdGroup: CreateResponse<Group | null>;
}>;

const initialState: StateType = {
    data: [],
    group: null,
    loading: false,
    failed: null,
    saving: false,
    deletedGroup: <DeleteResponse<string | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    revokedGroup: <ChangeResponse<Group | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    },
    createdGroup: <CreateResponse<Group | null>>{
        loading: false,
        success: false,
        failure: false,
        error: null,
        data : null
    }
};

const data = createReducer<Group[], ActionTypes>(initialState.data as Group[])
    .handleAction(actions.getGroups.success,(_, action) => action.payload)
    .handleAction(actions.getGroups.failure, () => []);

const group = createReducer<Group, ActionTypes>(initialState.group as Group)
    .handleAction(actions.setGroup, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getGroups.request, () => true)
    .handleAction(actions.getGroups.success, () => false)
    .handleAction(actions.getGroups.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getGroups.request, () => null)
    .handleAction(actions.getGroups.success, () => null)
    .handleAction(actions.getGroups.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getGroups.request, () => true)
    .handleAction(actions.getGroups.success, () => false)
    .handleAction(actions.getGroups.failure, () => false);

const deletedGroup = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deletedGroup)
    .handleAction(actions.deleteGroup.request, () => initialState.deletedGroup)
    .handleAction(actions.deleteGroup.success, (store, action) => action.payload)
    .handleAction(actions.deleteGroup.failure, (store, action) => action.payload)
    .handleAction(actions.setDeleteGroup, (store, action) => action.payload);

const createdGroup = createReducer<CreateResponse<Group | null>, ActionTypes>(initialState.createdGroup)
    .handleAction(actions.createGroup.request, () => initialState.createdGroup)
    .handleAction(actions.createGroup.success, (store, action) => action.payload)
    .handleAction(actions.createGroup.failure, (store, action) => action.payload)
    .handleAction(actions.setCreateGroup, (store, action) => action.payload)

export default combineReducers({
    data,
    group,
    loading,
    failed,
    saving,
    deletedGroup,
    createdGroup,
});
