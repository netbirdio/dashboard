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
  last_login?: Date;
}

export enum Role {
  User = "user",
  Admin = "admin",
  Owner = "owner",
}
