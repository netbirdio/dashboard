export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export interface NetbirdRelease {
  latest_version: string;
  last_checked: Date;
  url: string;
}
