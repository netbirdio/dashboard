export type DeviceAuthMode =
  | "disabled"
  | "optional"
  | "cert-only"
  | "cert-and-sso";
export type EnrollmentMode = "manual" | "attestation" | "both";
export type CAType = "builtin" | "vault" | "smallstep" | "scep";

export interface DeviceAuthSettings {
  mode: DeviceAuthMode;
  enrollment_mode: EnrollmentMode;
  ca_type: CAType;
  cert_validity_days: number;
}

export interface DeviceEnrollment {
  id: string;
  peer_id: string;
  wg_public_key: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  created_at: string;
}

export interface DeviceCert {
  id: string;
  peer_id: string;
  wg_public_key: string;
  serial: string;
  not_before: string;
  not_after: string;
  revoked: boolean;
  revoked_at?: string;
}

export interface TrustedCA {
  id: string;
  name: string;
  created_at: string;
}

// CA config types — for /device-auth/ca/config endpoints

export interface VaultCAConfig {
  address: string;
  token: string; // empty in GET response (redacted)
  has_token: boolean;
  mount: string;
  role: string;
  namespace: string;
  timeout_seconds: number;
}

export interface SmallstepCAConfig {
  url: string;
  provisioner_token: string; // empty in GET response
  has_provisioner_token: boolean;
  fingerprint: string;
  timeout_seconds: number;
}

export interface SCEPCAConfig {
  url: string;
  challenge: string; // empty in GET response
  has_challenge: boolean;
  timeout_seconds: number;
}

export interface CAConfig {
  ca_type: CAType;
  vault?: VaultCAConfig;
  smallstep?: SmallstepCAConfig;
  scep?: SCEPCAConfig;
}

// CA test result types — for /device-auth/ca/test endpoint

export type CATestStepStatus = "ok" | "error" | "skipped";

export interface CATestStep {
  name: string;
  status: CATestStepStatus;
  detail: string;
  fix_hint?: string;
  elapsed_ms: number;
}

export interface CATestResult {
  success: boolean;
  steps: CATestStep[];
}

// Inventory config types — for /device-auth/inventory/config endpoints
// Multiple sources can be enabled simultaneously (e.g., Intune for Windows + Jamf for Mac).

export interface StaticInventoryConfig {
  enabled: boolean;
  peers: string[];        // WireGuard public keys
  serial_count: number;   // read-only in GET; serials are managed by upload
}

export interface IntuneInventoryConfig {
  enabled: boolean;
  tenant_id: string;
  client_id: string;
  client_secret: string;    // empty in GET response
  has_client_secret: boolean;
  require_compliance: boolean;
}

export interface JamfInventoryConfig {
  enabled: boolean;
  jamf_url: string;
  client_id: string;
  client_secret: string;    // empty in GET response
  has_client_secret: boolean;
  require_management: boolean;
}

export interface InventoryConfig {
  static: StaticInventoryConfig;
  intune: IntuneInventoryConfig;
  jamf: JamfInventoryConfig;
}
