import {ActionType, createAsyncAction} from 'typesafe-actions';
import {Event} from './types';
import {ApiError, RequestPayload} from '../../services/api-client/types';

const actions = {
  getEvents: createAsyncAction(
      'GET_EVENTS_REQUEST',
      'GET_EVENTS_SUCCESS',
      'GET_EVENTS_FAILURE',
  )<RequestPayload<null>, Event[], ApiError>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
