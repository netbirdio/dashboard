import { Role } from "@/interfaces/User";

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  groups: TenantGroup[];
  activated_at?: string;
  disabled_at: string;
  created_at: string;
  updated_at: string;
  status: TenantStatus;
}

export interface TenantListItem {
  id: string;
  account_id: string;
  activated_at: string;
  created_at: string;
  disabled_at: string;
  name: string;
  domain: string;
  updated_at: string;
  status: TenantStatus;
  isMSP?: boolean; // Frontend only
}

export interface TenantDNSResponse {
  id: string;
  name: string;
  dns_challenge: string;
  domain: string;
  status: TenantStatus;
  groups: TenantGroup[];
  disabled_at: string;
  created_at: string;
  updated_at: string;
}

export interface TenantGroup {
  id?: string;
  role: Role;
  name?: string;
}

export enum TenantStatus {
  Existing = "existing",
  Invited = "invited",
  Pending = "pending",
  Active = "active",
}
