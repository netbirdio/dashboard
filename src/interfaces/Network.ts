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
  inspection?: InspectionConfig;
  search?: string;
}

export type InspectionAction = "allow" | "block" | "inspect";
export type InspectionMode = "builtin" | "envoy" | "external";

export interface InspectionEnvoySnippets {
  http_filters?: string;
  network_filters?: string;
  clusters?: string;
}

export interface InspectionConfig {
  enabled: boolean;
  mode?: InspectionMode;
  external_url?: string;
  default_action?: InspectionAction;
  redirect_ports?: number[];
  rules?: InspectionRule[];
  icap?: InspectionICAPConfig;
  ca_cert_pem?: string;
  ca_key_pem?: string;
  listen_port?: number;
}

export interface InspectionRule {
  id?: string;
  name: string;
  enabled: boolean;
  domains?: string[];
  networks?: string[];
  ports?: number[];
  action: InspectionAction;
  priority: number;
}

// Reusable inspection policy referenced from access control policies.
// Contains both L7 rules and proxy infrastructure config (CA, ICAP, mode).
export interface InspectionPolicy {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  rules: InspectionPolicyRule[];

  // Proxy infrastructure config
  mode?: InspectionMode;
  external_url?: string;
  default_action?: InspectionAction;
  redirect_ports?: number[];
  ca_cert_pem?: string;
  ca_key_pem?: string;
  icap?: InspectionICAPConfig;

  // Envoy sidecar config (mode "envoy" only)
  envoy_binary_path?: string;
  envoy_admin_port?: number;
  envoy_snippets?: InspectionEnvoySnippets;
}

export interface InspectionPolicyRule {
  domains?: string[];
  networks?: string[];
  protocols?: InspectionProtocol[];
  paths?: string[];
  action: InspectionAction;
  priority: number;
}

export type InspectionProtocol =
  | "http"
  | "https"
  | "h2"
  | "h3"
  | "websocket"
  | "other";

export interface InspectionICAPConfig {
  reqmod_url?: string;
  respmod_url?: string;
  max_connections?: number;
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

export interface NetworkResourceWithNetwork extends NetworkResource {
  network: Network;
}
