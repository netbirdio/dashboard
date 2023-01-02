import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { Event } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: Event[] | null;
  loading: boolean;
  failed: ApiError | null;
}>;

const initialState: StateType = {
  data: [],
  loading: false,
  failed: null,
};

const data = createReducer<Event[], ActionTypes>(initialState.data as Event[])
  .handleAction(actions.getEvents.success,(_, action) => action.payload)
  .handleAction(actions.getEvents.failure, () => []);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getEvents.request, () => true)
    .handleAction(actions.getEvents.success, () => false)
    .handleAction(actions.getEvents.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getEvents.request, () => null)
    .handleAction(actions.getEvents.success, () => null)
    .handleAction(actions.getEvents.failure, (store, action) => action.payload);


export default combineReducers({
  data,
  loading,
  failed,
});
