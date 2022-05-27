import { legacy_createStore as createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { composeWithDevTools } from 'redux-devtools-extension';

import { sagas as peerSagas } from './peer';
import { sagas as setupKeySagas } from './setup-key';

import rootReducer from './root-reducer';
import { apiClient } from '../services/api-client';

const sagaMiddleware = createSagaMiddleware();
const middlewares = [sagaMiddleware];

const enhancer = composeWithDevTools(applyMiddleware(...middlewares));

const store = createStore(rootReducer, enhancer);

sagaMiddleware.run(peerSagas);
sagaMiddleware.run(setupKeySagas);

export { apiClient, rootReducer, store };