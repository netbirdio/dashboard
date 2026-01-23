import { Permissions } from "@/interfaces/Permission";

export interface User {
  id: string;
  email?: string;
  name: string;
  role: Role;
  status: string;
  auto_groups: string[];
  is_current?: boolean;
  is_service_user?: boolean;
  is_blocked?: boolean;
  pending_approval?: boolean;
  last_login?: Date;
  permissions: Permissions;
  password?: string;
  idp_id?: string;
}

export interface UserInviteCreateRequest {
  email: string;
  name: string;
  role: string;
  auto_groups: string[];
  expires_in?: number;
}

export interface UserInviteCreateResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  auto_groups: string[];
  status: string;
  invite_link: string;
  invite_expires_at: string;
}

export interface UserInviteInfo {
  email: string;
  name: string;
  expires_at: string;
  valid: boolean;
}

export interface UserInviteAcceptRequest {
  password: string;
}

export interface UserInviteAcceptResponse {
  success: boolean;
}

export enum Role {
  User = "user",
  Admin = "admin",
  Owner = "owner",
  BillingAdmin = "billing_admin",
  Auditor = "auditor",
  NetworkAdmin = "network_admin",
}
