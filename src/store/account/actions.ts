import {ActionType, createAsyncAction} from 'typesafe-actions';
import {Account} from './types';
import {ApiError, RequestPayload} from '../../services/api-client/types';

const actions = {
  getAccounts: createAsyncAction(
      'GET_ACCOUNTS_REQUEST',
      'GET_ACCOUNTS_SUCCESS',
      'GET_ACCOUNTS_FAILURE',
  )<RequestPayload<null>, Account[], ApiError>(),
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
