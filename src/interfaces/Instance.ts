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
}
