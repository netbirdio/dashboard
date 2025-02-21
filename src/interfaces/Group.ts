export interface Group {
  id?: string;
  name: string;
  peers?: GroupPeer[] | string[];
  peers_count?: number;
  resources?: GroupResource[] | string[];
  resources_count?: number;
  issued?: GroupIssued;

  // Frontend only
  keepClientState?: boolean;
}

export interface GroupPeer {
  id: string;
  name: string;
}

export interface GroupResource {
  id: string;
  type: string;
}

export enum GroupIssued {
  API = "api",
  INTEGRATION = "integration",
  JWT = "jwt",
}
