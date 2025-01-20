import { Group } from "@/interfaces/Group";

export interface Network {
  id: string;
  name: string;
  description?: string;
  resources?: string[];
  policies?: string[];
  routers?: string[];
  routing_peers_count?: number;
}

export interface NetworkRouter {
  id: string;
  peer?: string;
  peer_groups?: string[];
  metric: number;
  masquerade: boolean;
  enabled: boolean;
}

export interface NetworkResource {
  id: string;
  name: string;
  description?: string;
  address: string;
  groups?: string[] | Group[];
  type?: "domain" | "host" | "subnet";
  enabled: boolean;
}
