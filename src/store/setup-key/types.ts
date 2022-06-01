export interface SetupKey {
  Expires: string;
  Id: string;
  Key: string;
  LastUsed: string;
  Name: string;
  Revoked: boolean;
  State: string;
  Type: string;
  UsedTimes: number;
  Valid: boolean;
}

export interface SetupKeyNew {
  Id: string;
  Name: string;
  Type: string;
}

export interface SetupKeyRevoke {
  Id: string;
  Revoked: boolean;
}
