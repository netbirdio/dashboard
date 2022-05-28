import { combineReducers } from 'redux';

import { reducer as peer } from './peer';
import { reducer as setupKey } from './setup-key';
import { reducer as user } from './user';

export default combineReducers({
  peer,
  setupKey,
  user
});
