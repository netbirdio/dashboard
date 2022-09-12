import {Group} from "../group/types";

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
  auto_groups: Group[]
}

export interface SetupKeyToSave
{
  id: string;
  name: string;
  type: string;
  revoked: boolean;
  auto_groups: string[]
}
