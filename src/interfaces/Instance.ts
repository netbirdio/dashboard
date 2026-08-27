export interface InstanceStatus {
  setup_required: boolean;
}

export interface SetupRequest {
  email: string;
  password: string;
  name: string;
}

export interface SetupResponse {
  user_id: string;
  email: string;
}

export interface ApiError {
  code: number;
  message: string;
}

export interface VersionInfo {
  management_current_version: string;
  management_available_version: string;
  dashboard_available_version: string;
  // Whether a newer management release exists, decided server-side with a full
  // semver comparison — so an enterprise build ("0.77.0+enterprise.1") counts
  // as up to date against "0.77.0". Optional: management servers that predate
  // the field omit it.
  management_update_available?: boolean;
}
