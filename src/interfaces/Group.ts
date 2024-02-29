export interface Group {
  id?: string;
  name: string;
  peers?: GroupPeer[] | string[];
  peers_count?: number;
  ipv6_enabled: boolean
}

export interface GroupPeer {
  id: string;
  name: string;
}
