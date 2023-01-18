import { ActionType, createAction, createAsyncAction } from 'typesafe-actions';
import {DNSSettings, DNSSettingsToSave} from './types';
import {ApiError, CreateResponse, RequestPayload} from '../../services/api-client/types';

const actions = {
  getDNSSettings: createAsyncAction(
      'GET_DNSSettings_REQUEST',
      'GET_DNSSettings_SUCCESS',
      'GET_DNSSettings_FAILURE',
  )<RequestPayload<null>, DNSSettings, ApiError>(),

  saveDNSSettings: createAsyncAction(
      'SAVE_DNSSettings_REQUEST',
      'SAVE_DNSSettings_SUCCESS',
      'SAVE_DNSSettings_FAILURE',
  )<RequestPayload<DNSSettingsToSave>, CreateResponse<DNSSettings | null>, CreateResponse<DNSSettings | null>>(),
  setSavedDNSSettings: createAction('SET_CREATE_DNSSettings')<CreateResponse<DNSSettings | null>>(),
  resetSavedDNSSettings: createAction('RESET_CREATE_DNSSettings')<null>(),

  setDNSSettings: createAction('SET_DNSSettings')<DNSSettings>(),
  setSetupNewDNSSettingsVisible: createAction('SET_SETUP_NEW_DNSSettings_VISIBLE')<boolean>(),
  setSetupNewDNSSettingsHA: createAction('SET_SETUP_NEW_DNSSettings_HA')<boolean>()
};

export type ActionTypes = ActionType<typeof actions>;
export default actions;
