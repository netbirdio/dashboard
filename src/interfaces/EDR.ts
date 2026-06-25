import { Group } from "@/interfaces/Group";

export interface CrowdstrikeIntegration {
  client_id: string;
  secret: string;
  cloud_id: string;
  groups: string[] | Group[];
  zta_score_threshold: number; // 0 - 100
  enabled: boolean;
}

export interface IntuneIntegration {
  client_id: string;
  secret: string;
  tenant_id: string;
  last_synced_interval: number;
  groups: string[] | Group[];
  enabled: boolean;
}

export interface WorkspaceOneIntegration {
  api_url: string;
  token_url: string;
  client_id: string;
  client_secret?: string;
  api_key?: string;
  last_synced_interval: number;
  last_synced_at?: string;
  groups: string[] | Group[];
  enabled: boolean;
}

export interface SentinelOneIntegration {
  api_token: string;
  api_url: string;
  last_synced_interval: number;
  last_synced_at?: string;
  groups: string[] | Group[];
  match_attributes: SentinelOneMatchAttributes;
  enabled: boolean;
}

export interface SentinelOneMatchAttributes {
  active_threats?: number;
  encrypted_applications?: boolean;
  firewall_enabled?: boolean;
  infected?: boolean;
  is_active?: boolean;
  is_up_to_date?: boolean;
  network_status?: string; // "connected"
  operational_state?: string; // "na"
}

export const DEFAULT_SENTINELONE_MATCH_ATTRIBUTES = {
  active_threats: 0,
  encrypted_applications: true,
  firewall_enabled: true,
  infected: false,
  is_active: true,
  is_up_to_date: true,
  network_status: "connected",
  operational_state: "na",
} as SentinelOneMatchAttributes;

export interface HuntressIntegration {
  api_key: string;
  api_secret: string;
  last_synced_interval: number;
  last_synced_at?: string;
  groups: string[] | Group[];
  match_attributes: HuntressMatchAttributes;
  enabled: boolean;
}

export interface HuntressMatchAttributes {
  defender_policy_status: string;
  defender_status: string;
  defender_substatus: string;
  firewall_status: string;
}

export const DEFAULT_HUNTRESS_MATCH_ATTRIBUTES = {
  defender_policy_status: "Compliant",
  defender_status: "Protected",
  defender_substatus: "Up to date",
  firewall_status: "Enabled",
} as HuntressMatchAttributes;

export interface FleetDMIntegration {
  api_url: string;
  api_token: string;
  last_synced_interval: number;
  last_synced_at?: string;
  groups: string[] | Group[];
  match_attributes: FleetDMMatchAttributes;
  enabled: boolean;
}

export interface FleetDMMatchAttributes {
  disk_encryption_enabled?: boolean;
  failing_policies_count_max?: number;
  vulnerable_software_count_max?: number;
  status_online?: boolean;
  required_policies?: number[];
}

export const DEFAULT_FLEETDM_MATCH_ATTRIBUTES = {
  disk_encryption_enabled: true,
  failing_policies_count_max: 0,
  status_online: true,
} as FleetDMMatchAttributes;
