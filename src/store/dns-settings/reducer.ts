import { createReducer } from 'typesafe-actions';
import { combineReducers } from 'redux';
import { DNSSettings } from './types';
import actions, { ActionTypes } from './actions';
import {ApiError, CreateResponse} from "../../services/api-client/types";

type StateType = Readonly<{
  data: DNSSettings | null;
  dnsSettings: DNSSettings | null;
  loading: boolean;
  failed: ApiError | null;
  saving: boolean;
  savedDNSSettings: CreateResponse<DNSSettings | null>;
  setupNewDNSSettingsVisible: boolean;
  setupNewDNSSettingsHA: boolean
}>;

const initialState: StateType = {
  data: null,
  dnsSettings: null,
  loading: false,
  failed: null,
  saving: false,
  savedDNSSettings: <CreateResponse<DNSSettings | null>>{
    loading: false,
    success: false,
    failure: false,
    error: null,
    data : null
  },
  setupNewDNSSettingsVisible: false,
  setupNewDNSSettingsHA: false
};

const data = createReducer<DNSSettings, ActionTypes>(initialState.data as DNSSettings)
    .handleAction(actions.getDNSSettings.success,(settings, _) => settings)
    .handleAction(actions.getDNSSettings.failure,(settings, _) => settings);

const dnsSettings = createReducer<DNSSettings, ActionTypes>(initialState.dnsSettings as DNSSettings)
    .handleAction(actions.setDNSSettings, (store, action) => action.payload);

const loading = createReducer<boolean, ActionTypes>(initialState.loading)
    .handleAction(actions.getDNSSettings.request, () => true)
    .handleAction(actions.getDNSSettings.success, () => false)
    .handleAction(actions.getDNSSettings.failure, () => false);

const failed = createReducer<ApiError | null, ActionTypes>(initialState.failed)
    .handleAction(actions.getDNSSettings.request, () => null)
    .handleAction(actions.getDNSSettings.success, () => null)
    .handleAction(actions.getDNSSettings.failure, (store, action) => action.payload);

const saving = createReducer<boolean, ActionTypes>(initialState.saving)
    .handleAction(actions.getDNSSettings.request, () => true)
    .handleAction(actions.getDNSSettings.success, () => false)
    .handleAction(actions.getDNSSettings.failure, () => false);

const savedDNSSettings = createReducer<CreateResponse<DNSSettings | null>, ActionTypes>(initialState.savedDNSSettings)
    .handleAction(actions.saveDNSSettings.request, () => initialState.savedDNSSettings)
    .handleAction(actions.saveDNSSettings.success, (store, action) => action.payload)
    .handleAction(actions.saveDNSSettings.failure, (store, action) => action.payload)
    .handleAction(actions.setSavedDNSSettings, (store, action) => action.payload)
    .handleAction(actions.resetSavedDNSSettings, () => initialState.savedDNSSettings)

const setupNewDNSSettingsVisible = createReducer<boolean, ActionTypes>(initialState.setupNewDNSSettingsVisible)
    .handleAction(actions.setSetupNewDNSSettingsVisible, (store, action) => action.payload)

const setupNewDNSSettingsHA = createReducer<boolean, ActionTypes>(initialState.setupNewDNSSettingsHA)
    .handleAction(actions.setSetupNewDNSSettingsHA, (store, action) => action.payload)

export default combineReducers({
  data,
  dnsSettings,
  loading,
  failed,
  saving,
  savedDNSSettings,
  setupNewDNSSettingsVisible,
  setupNewDNSSettingsHA
});
