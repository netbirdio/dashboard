export enum ServiceMode {
  HTTP = "http",
  TCP = "tcp",
  UDP = "udp",
  TLS = "tls",
}

export interface ReverseProxy {
  id?: string;
  name: string;
  domain: string;
  mode?: ServiceMode;
  listen_port?: number;
  port_auto_assigned?: boolean;
  proxy_cluster?: string;
  targets: ReverseProxyTarget[];
  enabled: boolean;
  pass_host_header?: boolean;
  rewrite_redirects?: boolean;
  auth?: ReverseProxyAuth;
  access_restrictions?: AccessRestrictions;
  meta?: ReverseProxyMeta;
}

export interface AccessRestrictions {
  allowed_cidrs?: string[];
  blocked_cidrs?: string[];
  allowed_countries?: string[];
  blocked_countries?: string[];
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

export type ServiceTargetOptionsPathRewrite = "preserve";

export interface ServiceTargetOptions {
  skip_tls_verify?: boolean;
  request_timeout?: string;
  session_idle_timeout?: string;
  path_rewrite?: ServiceTargetOptionsPathRewrite;
  custom_headers?: Record<string, string>;
  proxy_protocol?: boolean;
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
  options?: ServiceTargetOptions;
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
  header_auths?: HeaderAuthConfig[];
}

export interface HeaderAuthConfig {
  enabled: boolean;
  header: string;
  value: string;
}

export interface ReverseProxyDomain {
  id: string;
  domain: string;
  validated: boolean;
  type: ReverseProxyDomainType;
  target_cluster?: string;
  supports_custom_ports?: boolean;
  require_subdomain?: boolean;
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
  TCP = "tcp",
  UDP = "udp",
}

export enum EventProtocol {
  HTTP = "http",
  TCP = "tcp",
  UDP = "udp",
  TLS = "tls",
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
  subdivision_code?: string;
  bytes_upload: number;
  bytes_download: number;
  protocol?: EventProtocol;
}

export function isL4Event(event: ReverseProxyEvent): boolean {
  return (
    event.protocol === EventProtocol.TCP ||
    event.protocol === EventProtocol.UDP ||
    event.protocol === EventProtocol.TLS
  );
}

export interface ReverseProxyFlatTarget extends ReverseProxyTarget {
  proxy: ReverseProxy;
}

export function isL4Mode(mode?: ServiceMode): boolean {
  return (
    mode === ServiceMode.TCP ||
    mode === ServiceMode.UDP ||
    mode === ServiceMode.TLS
  );
}

export const REVERSE_PROXY_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy";

export const REVERSE_PROXY_SERVICES_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy#services";

export const REVERSE_PROXY_TARGETS_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy#targets";

export const REVERSE_PROXY_AUTHENTICATION_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy/authentication";

export const REVERSE_PROXY_SETTINGS_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy#step-4-configure-advanced-settings";

export const REVERSE_PROXY_CLUSTERS_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy#self-hosted-proxy-setup";

export const REVERSE_PROXY_CUSTOM_DOMAINS_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy/custom-domains";

export const REVERSE_PROXY_DOMAIN_VERIFICATION_LINK =
  "https://docs.netbird.io/manage/reverse-proxy/custom-domains#validating-a-custom-domain";

export const REVERSE_PROXY_EVENTS_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy/access-logs";

export const REVERSE_PROXY_ACCESS_CONTROL_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy";

export const REVERSE_PROXY_TROUBLESHOOTING_DOCS_LINK =
  "https://docs.netbird.io/manage/reverse-proxy#troubleshooting";
