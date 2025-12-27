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

export enum Role {
  User = "user",
  Admin = "admin",
  Owner = "owner",
  BillingAdmin = "billing_admin",
  Auditor = "auditor",
  NetworkAdmin = "network_admin",
}
