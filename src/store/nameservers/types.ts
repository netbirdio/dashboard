export interface NameServerGroup {
  id?: string;
  name: string;
  description: string;
  primary: boolean;
  domains: string[];
  nameservers: NameServer[];
  groups: string[];
  enabled: boolean;
}

export interface NameServer {
  ip: string;
  ns_type: string;
  port: number;
}

export interface NameServerGroupToSave extends NameServerGroup {
  groupsToCreate?: string[];
}
