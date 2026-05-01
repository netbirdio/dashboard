import { Group } from "@/interfaces/Group";

/**
 * Resolution strategy for a device that matches multiple mappings.
 * Mirrors the backend's `types.MappingResolution`.
 */
export type EntraDeviceMappingResolution = "strict_priority" | "union";

export const EntraDeviceMappingResolutionOptions: {
  value: EntraDeviceMappingResolution;
  label: string;
  description: string;
}[] = [
  {
    value: "strict_priority",
    label: "Strict priority",
    description:
      "Apply only the single mapping with the lowest priority. Ties are broken deterministically by ID.",
  },
  {
    value: "union",
    label: "Union",
    description:
      "Apply all matched mappings: union of auto-groups, OR on ephemeral, AND on extra DNS labels, earliest expiry wins.",
  },
];

/**
 * Integration-level configuration for Microsoft Entra device authentication.
 * Mirrors `integrationDTO` in management/server/http/handlers/entra_device_auth/handler.go.
 */
export interface EntraDeviceAuth {
  id?: string;
  tenant_id: string;
  client_id: string;
  /** Write-only; server returns "********" when a secret is already stored. */
  client_secret?: string;
  issuer?: string;
  audience?: string;
  enabled: boolean;
  require_intune_compliant: boolean;
  allow_tenant_only_fallback: boolean;
  fallback_auto_groups?: string[];
  mapping_resolution?: EntraDeviceMappingResolution;
  /** Go-duration string, e.g. "24h". Empty string disables revalidation. */
  revalidation_interval?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EntraDeviceAuthRequest {
  tenant_id: string;
  client_id: string;
  client_secret?: string;
  issuer?: string;
  audience?: string;
  enabled: boolean;
  require_intune_compliant: boolean;
  allow_tenant_only_fallback: boolean;
  fallback_auto_groups?: string[];
  mapping_resolution?: EntraDeviceMappingResolution;
  revalidation_interval?: string;
}

/**
 * A single Entra-group → NetBird-auto-groups mapping.
 * Mirrors `mappingDTO` in management/server/http/handlers/entra_device_auth/handler.go.
 */
export interface EntraDeviceMapping {
  id?: string;
  name: string;
  /** Entra Object ID (GUID) of the source security group. "*" for catch-all. */
  entra_group_id: string;
  auto_groups: string[];
  ephemeral: boolean;
  allow_extra_dns_labels: boolean;
  /** RFC3339 timestamp or null for "never". */
  expires_at?: string | null;
  revoked: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;

  // Frontend-only decoration (resolved from /groups).
  groups?: Group[];
}

export interface EntraDeviceMappingRequest {
  name: string;
  entra_group_id: string;
  auto_groups: string[];
  ephemeral: boolean;
  allow_extra_dns_labels: boolean;
  expires_at?: string | null;
  revoked: boolean;
  priority: number;
}
