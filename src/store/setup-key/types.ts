import {ExpiresInValue} from "../../views/ExpiresInInput";
import moment from "moment";

export interface SetupKey {
  expires: string;
  id: string;
  key: string;
  last_used: string;
  name: string;
  revoked: boolean;
  state: string;
  type: string;
  used_times: number;
  valid: boolean;
  auto_groups: string[]
  expires_in: number;
  usage_limit: number;
}

export interface FormSetupKey extends SetupKey {
  autoGroupNames: string[]
  expiresInFormatted: ExpiresInValue
  exp: moment.Moment
  last: moment.Moment
}

export interface SetupKeyToSave extends SetupKey
{
  groupsToCreate: string[]
}
