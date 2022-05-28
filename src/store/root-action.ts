import { actions as PeerActions } from './peer';
import { actions as SetupKeyActions } from './setup-key';
import { actions as UserActions } from './user';
import { actions as RuleActions } from './rule';

export default {
  peer: PeerActions,
  setupKey: SetupKeyActions,
  user: UserActions,
  rule: RuleActions
};
