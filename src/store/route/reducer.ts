import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Route } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, DeleteResponse, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: Route[] | null;
  route: Route | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  deleteRoute: DeleteResponse<string | null>;
  savedRoute: CreateResponse<Route | null>;
  setupNewRouteVisible: boolean;
  setupNewRouteHA: boolean;
  setupEditRouteVisible: boolean;
  setEditRoutePeerVisible: boolean;
}>;

const initialState: StateType = {
  data: [],
  route: null,
  loading: false,
  failed: null,
  saving: false,
  deleteRoute: <DeleteResponse<string | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data: null,
  },
  savedRoute: <CreateResponse<Route | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data: null,
  },
  setupNewRouteVisible: false,
  setupNewRouteHA: false,
  setupEditRouteVisible: false,
  setEditRoutePeerVisible: false,
};

const data = createReducer<Route[], ActionTypes>(initialState.data as Route[])
    .handleAction(actions.getRoutes.success,(_, action) => action.payload)
    .handleAction(actions.getRoutes.failure, () => []);

const route = createReducer<Route, ActionTypes>(initialState.route as Route)
    .handleAction(actions.setRoute, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getRoutes.request, () => true)
    .handleAction(actions.getRoutes.success, () => false)
    .handleAction(actions.getRoutes.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getRoutes.request, () => null)
    .handleAction(actions.getRoutes.success, () => null)
    .handleAction(actions.getRoutes.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getRoutes.request, () => true)
    .handleAction(actions.getRoutes.success, () => false)
    .handleAction(actions.getRoutes.failure, () => false);

const deletedRoute = createReducer<DeleteResponse<string | null>, ActionTypes>(initialState.deleteRoute)
    .handleAction(actions.deleteRoute.request, () => initialState.deleteRoute)
    .handleAction(actions.deleteRoute.success, (store, action) => action.payload)
    .handleAction(actions.deleteRoute.failure, (store, action) => action.payload)
    .handleAction(actions.setDeletedRoute, (store, action) => action.payload)
    .handleAction(actions.resetDeletedRoute, () => initialState.deleteRoute)

const savedRoute = createReducer<CreateResponse<Route | null>, ActionTypes>(initialState.savedRoute)
    .handleAction(actions.saveRoute.request, () => initialState.savedRoute)
    .handleAction(actions.saveRoute.success, (store, action) => action.payload)
    .handleAction(actions.saveRoute.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedRoute, (store, action) => action.payload)
    .handleAction(actions.resetSavedRoute, () => initialState.savedRoute)

const setupNewRouteVisible = createReducer<boolean, ActionTypes>(initialState.setupNewRouteVisible)
    .handleAction(actions.setSetupNewRouteVisible, (store, action) => action.payload)

const setupEditRouteVisible = createReducer<boolean, ActionTypes>(
  initialState.setupEditRouteVisible
).handleAction(
  actions.setSetupEditRouteVisible,
  (store, action) => action.payload
);


const setEditRoutePeerVisible = createReducer<boolean, ActionTypes>(
  initialState.setEditRoutePeerVisible
).handleAction(
  actions.setSetupEditRoutePeerVisible,
  (store, action) => action.payload
);

const setupNewRouteHA = createReducer<boolean, ActionTypes>(initialState.setupNewRouteHA)
    .handleAction(actions.setSetupNewRouteHA, (store, action) => action.payload)

export default combineReducers({
  data,
  route,
  loading,
  failed,
  saving,
  deletedRoute,
  savedRoute,
  setupNewRouteVisible,
  setupNewRouteHA,
  setupEditRouteVisible,
  setEditRoutePeerVisible,
});
