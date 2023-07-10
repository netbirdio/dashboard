import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { NameServerGroup } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: NameServerGroup[] | null;
  nameserverGroup: NameServerGroup | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  deleteNameServerGroup: DeleteResponse<string | null>;
  savedNameServerGroup: CreateResponse<NameServerGroup | null>;
  setupNewNameServerGroupVisible: boolean;
  setupEditNameServerGroupVisible: boolean;
  setupNewNameServerGroupHA: boolean
}>;

const initialState: StateType = {
  data: [],
  nameserverGroup: null,
  loading: false,
  failed: null,
  saving: false,
  deleteNameServerGroup: <DeleteResponse<string | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data: null,
  },
  savedNameServerGroup: <CreateResponse<NameServerGroup | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data: null,
  },
  setupNewNameServerGroupVisible: false,
  setupEditNameServerGroupVisible: false,
  setupNewNameServerGroupHA: false,
};

const data = createReducer<NameServerGroup[], ActionTypes>(initialState.data as NameServerGroup[])
    .handleAction(actions.getNameServerGroups.success,(_, action) => action.payload)
    .handleAction(actions.getNameServerGroups.failure, () => []);

const nameserverGroup = createReducer<NameServerGroup, ActionTypes>(initialState.nameserverGroup as NameServerGroup)
    .handleAction(actions.setNameServerGroup, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getNameServerGroups.request, () => true)
    .handleAction(actions.getNameServerGroups.success, () => false)
    .handleAction(actions.getNameServerGroups.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getNameServerGroups.request, () => null)
    .handleAction(actions.getNameServerGroups.success, () => null)
    .handleAction(actions.getNameServerGroups.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getNameServerGroups.request, () => true)
    .handleAction(actions.getNameServerGroups.success, () => false)
    .handleAction(actions.getNameServerGroups.failure, () => false);

const deletedNameServerGroup = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deleteNameServerGroup)
    .handleAction(actions.deleteNameServerGroup.request, () => initialState.deleteNameServerGroup)
    .handleAction(actions.deleteNameServerGroup.success, (store, action) => action.payload)
    .handleAction(actions.deleteNameServerGroup.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletedNameServerGroup, (store, action) => action.payload)
    .handleAction(actions.resetDeletedNameServerGroup, () => initialState.deleteNameServerGroup)

const savedNameServerGroup = createReducer<CreateResponse<NameServerGroup | null>, ActionTypes>(initialState.savedNameServerGroup)
    .handleAction(actions.saveNameServerGroup.request, () => initialState.savedNameServerGroup)
    .handleAction(actions.saveNameServerGroup.success, (store, action) => action.payload)
    .handleAction(actions.saveNameServerGroup.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedNameServerGroup, (store, action) => action.payload)
    .handleAction(actions.resetSavedNameServerGroup, () => initialState.savedNameServerGroup)

const setupNewNameServerGroupVisible = createReducer<boolean, ActionTypes>(initialState.setupNewNameServerGroupVisible)
    .handleAction(actions.setSetupNewNameServerGroupVisible, (store, action) => action.payload)

const setupEditNameServerGroupVisible = createReducer<boolean, ActionTypes>(initialState.setupEditNameServerGroupVisible)
    .handleAction(actions.setSetupEditNameServerGroupVisible, (store, action) => action.payload)

const setupNewNameServerGroupHA = createReducer<boolean, ActionTypes>(initialState.setupNewNameServerGroupHA)
    .handleAction(actions.setSetupNewNameServerGroupHA, (store, action) => action.payload)

export default combineReducers({
  data,
  nameserverGroup,
  loading,
  failed,
  saving,
  deletedNameServerGroup,
  savedNameServerGroup,
  setupNewNameServerGroupVisible,
  setupEditNameServerGroupVisible,
  setupNewNameServerGroupHA,
});
