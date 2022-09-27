import { combineReducers } from 'redux';

import { reducer as peer } from './peer';
import { reducer as setupKey } from './setup-key';
import { reducer as user } from './user';
import { reducer as group } from './group';
import { reducer as rule } from './rule';
import { reducer as route } from './route';
import { reducer as dns } from './dns';

export default combineReducers({
  peer,
  setupKey,
  user,
  group,
  rule,
  route,
  dns
});
