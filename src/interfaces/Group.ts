export interface Group {
  id?: string;
  name: string;
  peers?: GroupPeer[] | string[];
  peers_count?: number;
  resources?: string[];
  resources_count?: number;

  // Frontend only
  keepClientState?: boolean;
}

export interface GroupPeer {
  id: string;
  name: string;
}
