import {all, call, put, takeLatest} from 'redux-saga/effects';
import {ApiError, ApiResponse, CreateResponse} from '../../services/api-client/types';
import {User, UserToSave} from './types'
import service from './service';
import actions from './actions';
import serviceGroup from "../group/service";
import {Group} from "../group/types";
import {actions as groupActions} from "../group";

export function* getUsers(action: ReturnType<typeof actions.getUsers.request>): Generator {
  try {
    const effect = yield call(service.getUsers, action.payload);
    const response = effect as ApiResponse<User[]>;

    yield put(actions.getUsers.success(response.body));
  } catch (err) {
    yield put(actions.getUsers.failure(err as ApiError));
  }
}

export function* saveUser(action: ReturnType<typeof actions.saveUser.request>): Generator {
  try {
    yield put(actions.setSavedUser({
      loading: true,
      success: false,
      failure: false,
      error: null,
      data: null
    } as CreateResponse<User | null>))

    const userToSave = action.payload.payload

    let groupsToCreate = userToSave.groupsToCreate
    if (!groupsToCreate) {
      groupsToCreate = []
    }

    // first, create groups that were newly added by user
    const responsesGroup = yield all(groupsToCreate.map(g => call(serviceGroup.createGroup, {
          getAccessTokenSilently: action.payload.getAccessTokenSilently,
          payload: {name: g}
        })
    ))

    const resGroups = (responsesGroup as ApiResponse<Group>[]).filter(r => r.statusCode === 200).map(g => (g.body as Group)).map(g => g.id)
    const newGroups = [...userToSave.auto_groups, ...resGroups]
    let effect = yield call(service.editUser, {
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: {
        id: userToSave.id,
        name: userToSave.name,
        email: userToSave.email,
        role: userToSave.role,
        auto_groups: newGroups,
      } as UserToSave
    });
    const response = effect as ApiResponse<User>;

    yield put(actions.saveUser.success({
      loading: false,
      success: true,
      failure: false,
      error: null,
      data: response.body
    } as CreateResponse<User | null>));

    yield put(groupActions.getGroups.request({
      getAccessTokenSilently: action.payload.getAccessTokenSilently,
      payload: null
    }));
    yield put(actions.getUsers.request({getAccessTokenSilently: action.payload.getAccessTokenSilently, payload: null}));
  } catch (err) {
    yield put(actions.saveUser.failure({
      loading: false,
      success: false,
      failure: false,
      error: err as ApiError,
      data: null
    } as CreateResponse<User | null>));
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getUsers.request, getUsers),
    takeLatest(actions.saveUser.request, saveUser)
  ]);
}

