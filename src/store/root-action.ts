import { actions as PeerActions } from './peer';
import { actions as SetupKeyActions } from './setup-key';
import { actions as UserActions } from './user';

export default {
  peer: PeerActions,
  setupKey: SetupKeyActions,
  user: UserActions
};
