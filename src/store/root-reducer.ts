import { combineReducers } from 'redux';

import { reducer as peer } from './peer';
import { reducer as setupKey } from './setup-key';

export default combineReducers({
  peer,
  setupKey
});
