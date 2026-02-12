export interface ReverseProxy {
  id?: string;
  name: string;
  domain: string;
  proxy_cluster?: string;
  targets: ReverseProxyTarget[];
  enabled: boolean;
  pass_host_header?: boolean;
  rewrite_redirects?: boolean;
  auth?: ReverseProxyAuth;
  meta?: ReverseProxyMeta;
}

export interface ReverseProxyMeta {
  created_at: string;
  status: ReverseProxyStatus;
  certificate_issued_at?: string;
}

export enum ReverseProxyStatus {
  PENDING = "pending",
  ACTIVE = "active",
  TUNNEL_NOT_CREATED = "tunnel_not_created",
  CERTIFICATE_PENDING = "certificate_pending",
  CERTIFICATE_FAILED = "certificate_failed",
  ERROR = "error",
}

export interface ReverseProxyTarget {
  target_id?: string;
  target_type: ReverseProxyTargetType;
  path?: string;
  protocol: ReverseProxyTargetProtocol;
  host?: string;
  port: number;
  enabled: boolean;
  access_local?: boolean;
  // Frontend
  destination?: string;
}

export interface ReverseProxyAuth {
  password_auth?: {
    enabled: boolean;
    password: string;
  };
  pin_auth?: {
    enabled: boolean;
    pin: string;
  };
  bearer_auth?: {
    enabled: boolean;
    distribution_groups: string[];
  };
  link_auth?: {
    enabled: boolean;
  };
}

export interface ReverseProxyDomain {
  id: string;
  domain: string;
  validated: boolean;
  type: ReverseProxyDomainType;
  target_cluster?: string;
}

export enum ReverseProxyDomainType {
  FREE = "free",
  CUSTOM = "custom",
}

export enum ReverseProxyTargetType {
  PEER = "peer",
  HOST = "host",
  DOMAIN = "domain",
  SUBNET = "subnet",
}

export enum ReverseProxyTargetProtocol {
  HTTP = "http",
  HTTPS = "https",
}

export interface ReverseProxyEvent {
  id: string;
  service_id: string;
  timestamp: string;
  method: string;
  host: string;
  path: string;
  duration_ms: number;
  status_code: number;
  source_ip: string;
  reason?: string;
  user_id?: string;
  auth_method_used?: string;
  country_code?: string;
  city_name?: string;
}

export interface ReverseProxyFlatTarget extends ReverseProxyTarget {
  proxy: ReverseProxy;
}

export const REVERSE_PROXY_DOCS_LINK =
  "https://docs.netbird.io/how-to/reverse-proxy";

export const REVERSE_PROXY_CLUSTERS_DOCS_LINK =
  "https://docs.netbird.io/how-to/reverse-proxy";

export const REVERSE_PROXY_CUSTOM_DOMAINS_DOCS_LINK =
  "https://docs.netbird.io/how-to/reverse-proxy";

export const REVERSE_PROXY_DOMAIN_VERIFICATION_LINK =
  "https://docs.netbird.io/how-to/reverse-proxy";
