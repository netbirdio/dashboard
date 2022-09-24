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
}

export interface FormSetupKey extends SetupKey {
  autoGroupNames: string[]
}

export interface SetupKeyToSave extends SetupKey
{
  groupsToCreate: string[]
}
