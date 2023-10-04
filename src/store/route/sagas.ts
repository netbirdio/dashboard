import { all, call, put, select, takeLatest } from "redux-saga/effects";
import {
  ApiError,
  ApiResponse,
  CreateResponse,
  DeleteResponse,
} from "../../services/api-client/types";
import { Route } from "./types";
import service from "./service";
import actions from "./actions";
import serviceGroup from "../group/service";
import { Group } from "../group/types";
import { actions as groupActions } from "../group";

export function* getRoutes(
  action: ReturnType<typeof actions.getRoutes.request>
): Generator {
  try {
    yield put(
      actions.setDeletedRoute({
        loading: false,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as DeleteResponse<string | null>)
    );

    const effect = yield call(service.getRoutes, action.payload);
    const response = effect as ApiResponse<Route[]>;

    yield put(actions.getRoutes.success(response.body));
  } catch (err) {
    yield put(actions.getRoutes.failure(err as ApiError));
  }
}

export function* setCreatedRoute(
  action: ReturnType<typeof actions.setSavedRoute>
): Generator {
  yield put(actions.setSavedRoute(action.payload));
}

export function* saveRoute(
  action: ReturnType<typeof actions.saveRoute.request>
): Generator {
  try {
    yield put(
      actions.setSavedRoute({
        loading: true,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as CreateResponse<Route | null>)
    );

    const routeToSave = action.payload.payload;
    let groupsToCreate = routeToSave.groupsToCreate;
    if (!groupsToCreate) {
      groupsToCreate = [];
    }

    let peerGroupsToCreate = routeToSave.peerGroupsToCreate;
    if (!peerGroupsToCreate) {
      peerGroupsToCreate = [];
    }

    // first, create groups that were newly added by user
    const responsesGroup = yield all(
      groupsToCreate.map((g) =>
        call(serviceGroup.createGroup, {
          getAccessTokenSilently: action.payload.getAccessTokenSilently,
          payload: { name: g },
        })
      )
    );

    const responsesPeerGroup = yield all(
      peerGroupsToCreate.map((g) =>
        call(serviceGroup.createGroup, {
          getAccessTokenSilently: action.payload.getAccessTokenSilently,
          payload: { name: g },
        })
      )
    );

    const resGroups = (responsesGroup as ApiResponse<Group>[])
      .filter((r) => r.statusCode === 200)
      .map((g) => g.body as Group)
      .map((g) => g.id);
    const newGroups = [...routeToSave.groups, ...resGroups];


    const resPeersGroups = (responsesPeerGroup as ApiResponse<Group>[])
      .filter((r) => r.statusCode === 200)
      .map((g) => g.body as Group)
      .map((g) => g.id);
    const newPeerGroups = [...routeToSave?.peer_groups || [], ...resPeersGroups];

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
        peer: routeToSave.peer,
        peer_groups: newPeerGroups.length ? newPeerGroups : null,
        groups: newGroups,
      } as Route,
    };

    let effect;
    if (!routeToSave.id) {
      effect = yield call(service.createRoute, payloadToSave);
    } else {
      payloadToSave.payload.id = routeToSave.id;
      effect = yield call(service.editRoute, payloadToSave);
    }

    const response = effect as ApiResponse<Route>;

    yield put(
      actions.saveRoute.success({
        loading: false,
        success: true,
        failure: false,
        error: null,
        data: response.body,
      } as CreateResponse<Route | null>)
    );

    yield put(
      groupActions.getGroups.request({
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: null,
      })
    );

    yield put(
      actions.getRoutes.request({
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: null,
      })
    );
  } catch (err) {
    yield put(
      groupActions.getGroups.request({
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: null,
      })
    );

    yield put(
      actions.saveRoute.failure({
        loading: false,
        success: false,
        failure: true,
        error: err as ApiError,
        data: null,
      } as CreateResponse<Route | null>)
    );
  }
}

export function* setDeleteRoute(
  action: ReturnType<typeof actions.setDeletedRoute>
): Generator {
  yield put(actions.setDeletedRoute(action.payload));
}

export function* deleteRoute(
  action: ReturnType<typeof actions.deleteRoute.request>
): Generator {
  try {
    yield put(
      actions.setDeletedRoute({
        loading: true,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as DeleteResponse<string | null>)
    );

    const payloadType = typeof action.payload.payload;

    if (payloadType === "string") {
      const effect = yield call(service.deletedRoute, action.payload);
      const response = effect as ApiResponse<any>;

      yield put(
        actions.deleteRoute.success({
          loading: false,
          success: true,
          failure: false,
          error: null,
          data: response.body,
        } as DeleteResponse<string | null>)
      );
      const routes = (yield select((state) => state.route.data)) as Route[];

      yield put(
        actions.getRoutes.success(
          routes.filter((p: Route) => p.id !== action.payload.payload)
        )
      );
    } else {
      const effect = yield all(
        action.payload.payload.map((g: string) =>
          call(service.deletedRoute, {
            getAccessTokenSilently: action.payload.getAccessTokenSilently,
            payload: g,
          })
        )
      );

      const response = effect as Array<ApiResponse<any>>;
      yield put(
        actions.deleteRoute.success({
          loading: false,
          success: true,
          failure: false,
          error: null,
          data: response[0].body,
        } as DeleteResponse<string | null>)
      );

      const routes = (yield select((state) => state.route.data)) as Route[];

      yield put(
        actions.getRoutes.success(
          routes.filter((p: Route) => !action.payload.payload.includes(p.id))
        )
      );
    }
  } catch (err) {
    yield put(
      actions.deleteRoute.failure({
        loading: false,
        success: false,
        failure: false,
        error: err as ApiError,
        data: null,
      } as DeleteResponse<string | null>)
    );
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getRoutes.request, getRoutes),
    takeLatest(actions.saveRoute.request, saveRoute),
    takeLatest(actions.deleteRoute.request, deleteRoute),
  ]);
}
