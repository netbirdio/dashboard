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
}

export interface SetupKeyNew {
  id: string;
  name: string;
  type: string;
}

export interface SetupKeyRevoke {
  id: string;
  revoked: boolean;
}
