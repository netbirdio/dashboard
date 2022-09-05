import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {Route} from './types';
import {ApiError, CreateResponse, DeleteResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getRoutes: createAsyncAction(
      'GET_ROUTES_REQUEST',
      'GET_ROUTES_SUCCESS',
      'GET_ROUTES_FAILURE',
  )<RequestPayload<null>, Route[], ApiError>(),

  saveRoute: createAsyncAction(
      'SAVE_ROUTE_REQUEST',
      'SAVE_ROUTE_SUCCESS',
      'SAVE_ROUTE_FAILURE',
  )<RequestPayload<Route>, CreateResponse<Route | null>, CreateResponse<Route | null>>(),
  setSavedRoute: createAction('SET_CREATE_ROUTE')<CreateResponse<Route | null>>(),
  resetSavedRoute: createAction('RESET_CREATE_ROUTE')<null>(),
  
  deleteRoute: createAsyncAction(
      'DELETE_ROUTE_REQUEST',
      'DELETE_ROUTE_SUCCESS',
      'DELETE_ROUTE_FAILURE'
  )<RequestPayload<string>, DeleteResponse<string | null>, DeleteResponse<string | null>>(),
  setDeletedRoute: createAction('SET_DELETED_ROUTE')<DeleteResponse<string | null>>(),
  resetDeletedRoute: createAction('RESET_DELETED_ROUTE')<null>(),
  removeRoute:  createAction('REMOVE_ROUTE')<string>(),

  setRoute: createAction('SET_ROUTE')<Route>(),
  setSetupNewRouteVisible: createAction('SET_SETUP_NEW_ROUTE_VISIBLE')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
