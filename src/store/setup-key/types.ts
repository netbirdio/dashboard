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

export interface SetupKeyNew {
  id: string;
  name: string;
  type: string;
  auto_groups: string[]
}

export interface SetupKeyRevoke {
  id: string;
  revoked: boolean;
  name: string;
  auto_groups: string[]
}
