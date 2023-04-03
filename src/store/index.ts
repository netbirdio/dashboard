import { legacy_createStore as createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { composeWithDevTools } from 'redux-devtools-extension';

import { sagas as peerSagas } from './peer';
import { sagas as setupKeySagas } from './setup-key';
import { sagas as userSagas } from './user';
import { sagas as ruleSagas } from './rule';
import { sagas as groupSagas } from './group';
import { sagas as routeSagas } from './route';
import { sagas as nameserverGroupSagas } from './nameservers';
import { sagas as eventSagas } from './event';
import { sagas as dnsSettingsSagas } from './dns-settings';
import { sagas as accountSagas } from './account';
import { sagas as personalAccessTokenSagas } from './personal-access-token';

import rootReducer from './root-reducer';
import { apiClient } from '../services/api-client';

const sagaMiddleware = createSagaMiddleware();
const middlewares = [sagaMiddleware];

const enhancer = composeWithDevTools(applyMiddleware(...middlewares));

const store = createStore(rootReducer, enhancer);

sagaMiddleware.run(peerSagas);
sagaMiddleware.run(setupKeySagas);
sagaMiddleware.run(userSagas);
sagaMiddleware.run(ruleSagas);
sagaMiddleware.run(groupSagas);
sagaMiddleware.run(routeSagas);
sagaMiddleware.run(nameserverGroupSagas);
sagaMiddleware.run(eventSagas);
sagaMiddleware.run(dnsSettingsSagas);
sagaMiddleware.run(accountSagas);
sagaMiddleware.run(personalAccessTokenSagas);

export { apiClient, rootReducer, store };