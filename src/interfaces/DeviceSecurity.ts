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
  ocsp_enabled: boolean;
  fail_open_on_ocsp_unavailable: boolean;
  inventory_type: string;
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
