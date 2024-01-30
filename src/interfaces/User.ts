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

export interface FormUser extends User {
  autoGroupsNames: string[];
  is_active?: boolean;
}

export interface UserToSave extends User {
  groupsToCreate: string[];
}

export enum Role {
  User = "user",
  Admin = "admin",
  Owner = "owner",
}
