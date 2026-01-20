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

export const GROUP_TOOLTIP_TEXT = {
  RENAME: {
    JWT: "This group is issued by JWT and cannot be renamed.",
    INTEGRATION: "This group is issued by an IdP and cannot be renamed.",
  },
  DELETE: {
    INTEGRATION: "This group is issued by an IdP and cannot be deleted.",
  },
  IN_USE: "Remove dependencies to this group to delete it.",
};
