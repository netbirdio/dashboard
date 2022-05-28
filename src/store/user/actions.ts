import { ActionType, createAsyncAction } from 'typesafe-actions';
import { User } from './types';
import { ApiError, RequestPayload } from '../../services/api-client/types';

const actions = {
  getUsers: createAsyncAction(
      'GET_USERS_REQUEST',
      'GET_USERS_SUCCESS',
      'GET_USERS_FAILURE',
  )<RequestPayload<null>, User[], ApiError>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
