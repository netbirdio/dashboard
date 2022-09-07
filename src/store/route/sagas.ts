import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse, DeleteResponse} from '../../services/api-client/types';
import {Route} from './types'
import service from './service';
import actions from './actions';

export function* getRoutes(action: ReturnType<typeof actions.getRoutes.request>): Generator {
  try {

    yield put(actions.setDeletedRoute({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getRoutes, action.payload);
    const response = effect as ApiResponse<Route[]>;

    yield put(actions.getRoutes.success(response.body));
  } catch (err) {
    yield put(actions.getRoutes.failure(err as ApiError));
  }
}

export function* setCreatedRoute(action: ReturnType<typeof  actions.setSavedRoute>): Generator {
  yield put(actions.setSavedRoute(action.payload))
}

export function* saveRoute(action: ReturnType<typeof actions.saveRoute.request>): Generator {
  try {
    yield put(actions.setSavedRoute({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<Route | null>))

    const routeToSave = action.payload.payload

    const payloadToSave = {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        id: routeToSave.id,
        description: routeToSave.description,
        enabled: routeToSave.enabled,
        masquerade: routeToSave.masquerade,
        metric: routeToSave.metric,
        network: routeToSave.network,
        network_id: routeToSave.network_id,
        peer: routeToSave.peer
      } as Route
    }

    let effect
    if (!routeToSave.id) {
       effect = yield call(service.createRoute, payloadToSave);
    } else {
      payloadToSave.payload.id = routeToSave.id
      effect = yield call(service.editRoute, payloadToSave);
    }

    const response = effect as ApiResponse<Route>;

    yield put(actions.saveRoute.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<Route | null>));

    yield put(actions.getRoutes.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
  } catch (err) {
    yield put(actions.saveRoute.failure({
      loading: false,
      success: false,
      failure: true,
      error: err as ApiError,
      data: null
    } as CreateResponse<Route | null>));
  }
}

export function* setDeleteRoute(action: ReturnType<typeof  actions.setDeletedRoute>): Generator {
  yield put(actions.setDeletedRoute(action.payload))
}

export function* deleteRoute(action: ReturnType<typeof actions.deleteRoute.request>): Generator {
  try {
    yield call(actions.setDeletedRoute,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deletedRoute, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deleteRoute.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const routes = (yield select(state => state.route.data)) as Route[]
    yield put(actions.getRoutes.success(routes.filter((p:Route) => p.id !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deleteRoute.failure({
      loading: false,
      success: false,
      failure: false,
      error: err as ApiError,
      data: null
    } as DeleteResponse<string | null>));
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getRoutes.request, getRoutes),
    takeLatest(actions.saveRoute.request, saveRoute),
    takeLatest(actions.deleteRoute.request, deleteRoute)
  ]);
}

