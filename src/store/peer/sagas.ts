import {all, call, spawn, put, select, takeLatest} from 'redux-saga/effects';
import {
  ApiError,
  ApiResponse,
  ChangeResponse,
  CreateResponse,
  DeleteResponse,
  RequestPayload
} from '../../services/api-client/types';
import { Peer } from './types'
import service from './service';
import actions from './actions';
import {Group, GroupPeer} from "../group/types";
import serviceGroup from "../group/service";
import {actions as groupActions} from "../group";
import {Rule} from "../rule/types";


export function* getPeers(action: ReturnType<typeof actions.getPeers.request>): Generator {
  try {

    yield put(actions.setDeletePeer({
      loading: false,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>))

    const effect = yield call(service.getPeers, action.payload);
    const response = effect as ApiResponse<Peer[]>;

    yield put(actions.getPeers.success(response.body));
  } catch (err) {
    yield put(actions.getPeers.failure(err as ApiError));
  }
}

export function* setDeletePeer(action: ReturnType<typeof  actions.setDeletePeer>): Generator {
  yield put(actions.setDeletePeer(action.payload))
}

export function* deletePeer(action: ReturnType<typeof actions.deletedPeer.request>): Generator {
  try {
    yield call(actions.setDeletePeer,{
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as DeleteResponse<string | null>)

    const effect = yield call(service.deletedPeer, action.payload);
    const response = effect as ApiResponse<any>;

    yield put(actions.deletedPeer.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as DeleteResponse<string | null>));

    const peers = (yield select(state => state.peer.data)) as Peer[]
    yield put(actions.getPeers.success(peers.filter((p:Peer) => p.IP !== action.payload.payload)))
  } catch (err) {
    yield put(actions.deletedPeer.failure({
      loading: false,
      success: false,
      failure: false,
      error: err as ApiError,
      data: null
    } as DeleteResponse<string | null>));
  }
}

export function* saveGroups(action: ReturnType<typeof actions.saveGroups.request>): Generator {
  try {
    yield put(actions.setSavedGroups({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    }))

    const currentGroups = [...(yield select(state => state.group.data)) as Group[]]

    const peerGroupsToSave = action.payload.payload

    let groupsToSave = [] as Group[]
    let groupsNoId = [] as Group[]

    groupsToSave = groupsToSave.concat(
        currentGroups
            .filter(g => peerGroupsToSave.groupsToRemove.includes(g.ID || ''))
            .map(g => ({
              ID: g.ID,
              Name: g.Name,
              Peers: (g.Peers as GroupPeer[]).filter(p => p.ID !== peerGroupsToSave.ID).map(p => p.ID) as string[]
            }))
    )

    groupsToSave = groupsToSave.concat(
        currentGroups
            .filter(g => peerGroupsToSave.groupsToAdd.includes(g.ID || ''))
            .map(g => ({
              ID: g.ID,
              Name: g.Name,
              Peers: g.Peers ? [...(g.Peers as GroupPeer[]).map((p:GroupPeer) => p.ID), peerGroupsToSave.ID] : [peerGroupsToSave.ID]
            }))
    )

    groupsNoId = peerGroupsToSave.groupsNoId.map(g => ({
      Name: g,
      Peers: [peerGroupsToSave.ID]
    }))

    if (!groupsNoId.length && !groupsToSave.length) {
      return
    }

    const responsesGroup = yield all(groupsToSave.map(g => call(serviceGroup.editGroup, {
         getAccessTokenSilently: action.payload.getAccessTokenSilently,
         payload: g
       })
    ))

    const responsesGroupNoId = yield all(groupsNoId.map(g => call(serviceGroup.createGroup, {
         getAccessTokenSilently: action.payload.getAccessTokenSilently,
         payload: g
       })
    ))
    
    yield put(actions.saveGroups.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: [...(responsesGroup as ApiResponse<Group>[]).map(r => r.body), ...(responsesGroupNoId as ApiResponse<Group>[]).map(r => r.body)]
    } as CreateResponse<Group[] | null>))

    yield put(groupActions.getGroups.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));
    yield put(actions.getPeers.request({ getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null }));

  } catch (err) {
    console.log(err)
    yield put(actions.saveGroups.failure({
      loading: false,
      success: false,
      failure: true,
      error: err as ApiError,
      data: null
    } as ChangeResponse<Group[] | null>));
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getPeers.request, getPeers),
    takeLatest(actions.deletedPeer.request, deletePeer),
    takeLatest(actions.saveGroups.request, saveGroups)
  ]);
}

