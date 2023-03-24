import { combineReducers } from 'redux';

import { reducer as peer } from './peer';
import { reducer as setupKey } from './setup-key';
import { reducer as user } from './user';
import { reducer as group } from './group';
import { reducer as rule } from './rule';
import { reducer as route } from './route';
import { reducer as nameserverGroup } from './nameservers';
import { reducer as event } from './event';
import { reducer as dnsSettings } from './dns-settings';
import { reducer as account } from './account';
import { reducer as personalAccessToken } from './personal-access-token';

export default combineReducers({
  peer,
  setupKey,
  user,
  group,
  rule,
  route,
  nameserverGroup,
  event,
  dnsSettings,
  account,
  personalAccessToken
});
