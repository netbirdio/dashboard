import { all, call, put, select, takeLatest } from "redux-saga/effects";
import {
  ApiError,
  ApiResponse,
  CreateResponse,
  DeleteResponse,
} from "../../services/api-client/types";
import { Policy, PolicyRule } from "./types";
import service from "./service";
import serviceGroup from "../group/service";
import actions from "./actions";
import { actions as groupActions } from "../group";
import { Group } from "../group/types";

export function* getPolicies(
  action: ReturnType<typeof actions.getPolicies.request>
): Generator {
  try {
    yield put(
      actions.setDeletedPolicy({
        loading: false,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as DeleteResponse<string | null>)
    );

    const effect = yield call(service.getPolicies, action.payload);
    const response = effect as ApiResponse<Policy[]>;

    yield put(actions.getPolicies.success(response.body));
  } catch (err) {
    yield put(actions.getPolicies.failure(err as ApiError));
  }
}

export function* setCreatedPolicy(
  action: ReturnType<typeof actions.setSavedPolicy>
): Generator {
  yield put(actions.setSavedPolicy(action.payload));
}

function getNewGroupIds(dataString: string[], responses: Group[]): string[] {
  return responses
    .filter((r) => dataString.includes(r.name))
    .map((r) => r.id || "");
}

export function* savePolicy(
  action: ReturnType<typeof actions.savePolicy.request>
): Generator {
  try {
    yield put(
      actions.setSavedPolicy({
        loading: true,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as CreateResponse<Policy | null>)
    );

    const policyToSave = action.payload.payload;
    const groupsToSave = policyToSave.groupsToSave
      ? policyToSave.groupsToSave
      : [];
    const responsesGroup = yield all(
      groupsToSave.map((g) =>
        call(serviceGroup.createGroup, {
          getAccessTokenSilently: action.payload.getAccessTokenSilently,
          payload: { name: g },
        })
      )
    );

    const resGroups = (responsesGroup as ApiResponse<Policy>[])
      .filter((r) => r.statusCode === 200)
      .map((r) => r.body as Group);

    const currentGroups = [
      ...((yield select((state) => state.group.data)) as Policy[]),
    ];
    const newGroups = [...currentGroups, ...resGroups];
    yield put(groupActions.getGroups.success(newGroups));

    const newSources = getNewGroupIds(
      policyToSave.sourcesNoId ? policyToSave.sourcesNoId : [],
      resGroups
    );
    const newDestinations = getNewGroupIds(
      policyToSave.destinationsNoId ? policyToSave.destinationsNoId : [],
      resGroups
    );

    const payloadToSave = {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        name: policyToSave.name,
        description: policyToSave.description,
        enabled: policyToSave.enabled,
        query: policyToSave.query,
      } as Policy,
    };
    if (policyToSave.rules.length > 0) {
      payloadToSave.payload.rules = [];
    }
    policyToSave.rules.forEach((r) => {
      payloadToSave.payload.rules.push({
        name: r.name,
        description: r.description,
        enabled: r.enabled,
        sources: [...(r.sources as string[]), ...newSources],
        destinations: [...(r.destinations as string[]), ...newDestinations],
        bidirectional: r.bidirectional,
        protocol: r.protocol,
        ports: r.ports,
        action: r.action,
      } as PolicyRule);
    });

    let effect;
    if (!policyToSave.id) {
      effect = yield call(service.createPolicy, payloadToSave);
    } else {
      payloadToSave.payload.id = policyToSave.id;
      effect = yield call(service.editPolicy, payloadToSave);
    }

    const response = effect as ApiResponse<Policy>;

    yield put(
      actions.savePolicy.success({
        loading: false,
        success: true,
        failure: false,
        error: null,
        data: response.body,
      } as CreateResponse<Policy | null>)
    );

    yield put(
      groupActions.getGroups.request({
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: null,
      })
    );
    yield put(
      actions.getPolicies.request({
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: null,
      })
    );
  } catch (err) {
    yield put(
      actions.savePolicy.failure({
        loading: false,
        success: false,
        failure: true,
        error: err as ApiError,
        data: null,
      } as CreateResponse<Policy | null>)
    );
  }
}

export function* setDeletePolicy(
  action: ReturnType<typeof actions.setDeletedPolicy>
): Generator {
  yield put(actions.setDeletedPolicy(action.payload));
}

export function* deletePolicy(
  action: ReturnType<typeof actions.deletePolicy.request>
): Generator {
  try {
    yield put(
      actions.setDeletedPolicy({
        loading: true,
        success: false,
        failure: false,
        error: null,
        data: null,
      })
    );

    const effect = yield call(service.deletedPolicy, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(
      actions.deletePolicy.success({
        loading: false,
        success: true,
        failure: false,
        error: null,
        data: response.body,
      } as DeleteResponse<string | null>)
    );

    const policies = (yield select((state) => state.policy.data)) as Policy[];
    yield put(
      actions.getPolicies.success(
        policies.filter((p: Policy) => p.id !== action.payload.payload)
      )
    );
  } catch (err) {
    yield put(
      actions.deletePolicy.failure({
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
    takeLatest(actions.getPolicies.request, getPolicies),
    takeLatest(actions.savePolicy.request, savePolicy),
    takeLatest(actions.deletePolicy.request, deletePolicy),
  ]);
}
